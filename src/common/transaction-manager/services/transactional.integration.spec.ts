import { AccessCacheTopicAction, InvalidationScope } from "@monadiam/shared";
import { describe, expect, it, jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { TransactionalHelper } from "~testing/integration/transaction-manager/transactional.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { ActionType, EntityType, KafkaTopic } from "~context/enums";

import { AuditLog, ChangeLog, Inbox, Outbox } from "../entities";

describe("TransactionalService integration", () => {
    const helper = new TransactionalHelper();
    const suite = postgresSuite({
        repository: ({ orm }) => helper.createTransactionalServiceContext({ orm }),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    const AUDIT_PROPS = {
        context: { ip: "127.0.0.1", userAgent: "transactional-integration" },
        actionType: ActionType.CREATE,
        entityType: EntityType.EMPLOYEE,
        actor: randomUUID(),
        realm: randomUUID(),
    };

    const INCOMING_MESSAGE = {
        source: { topic: "source-topic", partition: 0, offset: "42" },
        event: "00000000-0000-4000-8000-000000000001",
        consumerKey: "hr.placeholder.v1",
    };

    describe("consume", () => {
        it("commits inbox and effects exactly once", async () => {
            const executeDuplicate = jest.fn(() => Promise.reject(new Error("duplicate callback must not execute")));

            const first = await suite.repository().service.consume({
                incoming: INCOMING_MESSAGE,
                audit: AUDIT_PROPS,
                execute: () => Promise.resolve(),
            });
            const duplicate = await suite.repository().service.consume({
                incoming: INCOMING_MESSAGE,
                audit: AUDIT_PROPS,
                execute: executeDuplicate,
            });

            const readManager = suite.repository().readManager;
            readManager.clear();

            expect(first).toEqual({ status: "processed", value: undefined });
            expect(duplicate).toEqual({ status: "duplicate" });
            expect(executeDuplicate).not.toHaveBeenCalled();
            await expect(readManager.count(Inbox, {})).resolves.toBe(1);
            await expect(readManager.count(AuditLog, {})).resolves.toBe(1);
            await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.AUDIT_LOG_ARCHIVE })).resolves.toBe(1);
        });

        it("rolls back a failed claim and allows redelivery", async () => {
            const incoming = { ...INCOMING_MESSAGE, event: "00000000-0000-4000-8000-000000000002" };
            const failure = new Error("domain failed");

            await expect(
                suite.repository().service.consume({
                    incoming,
                    execute: () => Promise.reject(failure),
                }),
            ).rejects.toBe(failure);

            const readManager = suite.repository().readManager;
            readManager.clear();
            await expect(readManager.count(Inbox, {})).resolves.toBe(0);

            await expect(
                suite.repository().service.consume({ incoming, execute: () => Promise.resolve() }),
            ).resolves.toEqual({
                status: "processed",
                value: undefined,
            });

            readManager.clear();
            await expect(readManager.count(Inbox, {})).resolves.toBe(1);
        });

        it("allows only one concurrent transaction to process an event", async () => {
            const incoming = { ...INCOMING_MESSAGE, event: "00000000-0000-4000-8000-000000000003" };
            const execute = jest.fn(() => Promise.resolve());
            const consume = (): TransactionManager.Service.Consume.Result<void> =>
                suite.repository().service.consume({ incoming, execute });

            const outcomes = await Promise.all([consume(), consume()]);
            const readManager = suite.repository().readManager;
            readManager.clear();

            expect(outcomes.map(({ status }) => status).sort()).toEqual(["duplicate", "processed"]);
            expect(execute).toHaveBeenCalledTimes(1);
            await expect(readManager.count(Inbox, {})).resolves.toBe(1);
        });
    });

    describe("run", () => {
        it("commits audit log and archive outbox in one trace", async () => {
            await suite.repository().service.run({
                audit: { ...AUDIT_PROPS, input: { password: "secret-value" } },
                execute: () => Promise.resolve(),
            });

            const readManager = suite.repository().readManager;
            readManager.clear();
            const auditLogs = await readManager.find(AuditLog, {});

            expect(auditLogs).toHaveLength(1);
            expect(auditLogs[0]).toEqual(
                expect.objectContaining({
                    input: { password: "masked:secret-value" },
                    signature: expect.stringContaining("signed:AuditLog:"),
                    keyVersion: 7,
                }),
            );
            await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.AUDIT_LOG_ARCHIVE })).resolves.toBe(1);
            await expect(readManager.count(ChangeLog, {})).resolves.toBe(0);
        });

        it("runs without audit context", async () => {
            await suite.repository().service.run({
                execute: () => Promise.resolve(),
            });

            await helper.expectNoTransactionRows(suite.repository().readManager);
        });

        it("does not execute domain code when audit signing fails", async () => {
            const externalError = new Error("vault signing unavailable");
            const execute = jest.fn<(transaction: ORM.EntityManager) => void>();
            const logMaskingService = helper.createLogMaskingService({
                sign: () => Promise.reject(externalError),
            });
            const service = helper.createTransactionalServiceContext({
                orm: suite.repository().orm,
                logMaskingService,
            }).service;

            await expect(
                service.run({
                    audit: AUDIT_PROPS,
                    execute,
                }),
            ).rejects.toBe(externalError);

            expect(execute).not.toHaveBeenCalled();
            await helper.expectNoTransactionRows(suite.repository().readManager);
        });
    });

    describe("emit", () => {
        it("emits audit log, audit archive and outbox without change log", async () => {
            await suite.repository().service.emit({
                audit: { ...AUDIT_PROPS, input: { password: "rejected-secret" } },
                payload: { items: [{ scope: InvalidationScope.GLOBAL }] },
                actionType: AccessCacheTopicAction.INVALIDATE,
                destinationTopic: KafkaTopic.ACCESS_CACHE,
            });

            const readManager = suite.repository().readManager;
            readManager.clear();
            const auditLogs = await readManager.find(AuditLog, {});

            expect(auditLogs).toHaveLength(1);
            expect(auditLogs[0]).toEqual(
                expect.objectContaining({
                    input: { password: "masked:rejected-secret" },
                    signature: expect.stringContaining("signed:AuditLog:"),
                    keyVersion: 7,
                }),
            );
            await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.AUDIT_LOG_ARCHIVE })).resolves.toBe(1);
            await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.ACCESS_CACHE })).resolves.toBe(1);
            await expect(readManager.count(ChangeLog, {})).resolves.toBe(0);
        });

        it("preserves external dependency errors raised before transaction commit", async () => {
            const externalError = new Error("schema registry unavailable");
            const outboxService = helper.createOutboxService({
                build: () => {
                    throw externalError;
                },
            });
            const service = helper.createTransactionalServiceContext({
                logMaskingService: helper.createLogMaskingService(),
                orm: suite.repository().orm,
                outboxService,
            }).service;

            await expect(
                service.emit({
                    audit: AUDIT_PROPS,
                    payload: { items: [{ scope: InvalidationScope.GLOBAL }] },
                    actionType: AccessCacheTopicAction.INVALIDATE,
                    destinationTopic: KafkaTopic.ACCESS_CACHE,
                }),
            ).rejects.toBe(externalError);

            await helper.expectNoTransactionRows(suite.repository().readManager);
        });
    });

    describe("consume with payload", () => {
        const props = {
            incoming: INCOMING_MESSAGE,
            audit: { ...AUDIT_PROPS, input: { password: "payload-secret" } },
            payload: { items: [{ scope: InvalidationScope.GLOBAL }] },
            actionType: AccessCacheTopicAction.INVALIDATE,
            destinationTopic: KafkaTopic.ACCESS_CACHE,
        } satisfies TransactionManager.Service.Consume.PayloadProps;

        it("commits the inbox, masked audit and payload exactly once", async () => {
            const { service, readManager } = suite.repository();

            const first = await service.consume(props);
            const duplicate = await service.consume(props);

            readManager.clear();
            expect(first).toEqual({ status: "processed", value: undefined });
            expect(duplicate).toEqual({ status: "duplicate" });
            await expect(readManager.count(Inbox, {})).resolves.toBe(1);
            await expect(readManager.count(ChangeLog, {})).resolves.toBe(0);
            await expect(readManager.count(Outbox, {})).resolves.toBe(2);
            await expect(readManager.count(AuditLog, {})).resolves.toBe(1);
            const audit = await readManager.findOneOrFail(AuditLog, { actor: AUDIT_PROPS.actor });
            const event = await readManager.findOneOrFail(Outbox, { destinationTopic: KafkaTopic.ACCESS_CACHE });
            expect(audit.input).toEqual({ password: "masked:payload-secret" });
            expect(event.payload).toEqual(props.payload);
        });

        it("deduplicates concurrent payload deliveries", async () => {
            const { service, readManager } = suite.repository();

            const outcomes = await Promise.all([service.consume(props), service.consume(props)]);

            readManager.clear();
            expect(outcomes.map(({ status }) => status).sort()).toEqual(["duplicate", "processed"]);
            await expect(readManager.count(Inbox, {})).resolves.toBe(1);
            await expect(readManager.count(AuditLog, {})).resolves.toBe(1);
            await expect(readManager.count(Outbox, {})).resolves.toBe(2);
        });

        it.each(["outbox", "audit"] as const)("rolls back a failed %s and permits payload redelivery", async (stage) => {
            const error = new Error("payload effects failed");
            const outboxService = helper.createOutboxService(
                stage === "outbox"
                    ? {
                          buildAuditLogArchive: () => {
                              throw error;
                          },
                      }
                    : {},
            );
            const logMaskingService = helper.createLogMaskingService(
                stage === "audit"
                    ? {
                          sign: () => Promise.reject(error),
                      }
                    : {},
            );
            const { readManager, service } = suite.repository();
            const failing = helper.createTransactionalServiceContext({
                orm: suite.repository().orm,
                outboxService,
                logMaskingService,
            }).service;

            await expect(failing.consume(props)).rejects.toBe(error);

            readManager.clear();
            await expect(readManager.count(Inbox, {})).resolves.toBe(0);
            await expect(readManager.count(AuditLog, {})).resolves.toBe(0);
            await expect(readManager.count(Outbox, {})).resolves.toBe(0);
            await expect(readManager.count(ChangeLog, {})).resolves.toBe(0);

            await expect(service.consume(props)).resolves.toEqual({ status: "processed", value: undefined });

            readManager.clear();
            await expect(readManager.count(Inbox, {})).resolves.toBe(1);
            await expect(readManager.count(AuditLog, {})).resolves.toBe(1);
            await expect(readManager.count(Outbox, {})).resolves.toBe(2);
        });
    });
});
