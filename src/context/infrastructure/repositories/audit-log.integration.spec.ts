import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { PublicStringOperator } from "~infrastructure/database/enums";
import { ActionType, EntityType } from "~context/enums";

import { AuditLogRepository } from "./audit-log.repository";

describe("AuditLogRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new AuditLogRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("maps the persisted audit log entry through the schema", async () => {
            const realm = randomUUID();
            const actor = randomUUID();
            const auditLog = await suite.fixtures().createAuditLog({
                context: { ip: "10.20.30.40", userAgent: "mapping-agent" },
                input: { firstName: "Updated Name" },
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.UPDATE,
                actor,
                realm,
            });

            await expect(suite.repository().findUniqueOrThrow({ where: { id: auditLog.id } })).resolves.toMatchObject({
                input: { firstName: "Updated Name" },
                keyVersion: auditLog.keyVersion,
                entityType: EntityType.EMPLOYEE,
                signature: auditLog.signature,
                createdAt: auditLog.createdAt,
                actionType: ActionType.UPDATE,
                userAgent: "mapping-agent",
                ip: "10.20.30.40",
                id: auditLog.id,
                actor,
                realm,
            });
        });
    });

    describe("findMany", () => {
        it("finds audit log entries by action and entity mapper filters", async () => {
            const matched = await suite.fixtures().createAuditLog({
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.CREATE,
            });
            await suite.fixtures().createAuditLog({
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.UPDATE,
            });
            await suite.fixtures().createAuditLog({
                entityType: EntityType.POSITION,
                actionType: ActionType.CREATE,
            });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    actionType: {
                        operator: PublicStringOperator.EQUAL,
                        value: ActionType.CREATE,
                    },
                    entityType: {
                        operator: PublicStringOperator.EQUAL,
                        value: EntityType.EMPLOYEE,
                    },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });
    });
});
