import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { PublicStringOperator } from "~infrastructure/database/enums";
import { AuditLogMapper } from "~context/infrastructure/mappers";
import { ActionType, EntityType } from "~context/enums";
import { AuditLog } from "~common/transaction-manager";

import { BaseRepository } from "./mixin";

class TestRepository extends BaseRepository<SystemEntities.AuditLog, Repositories.Mappers.AuditLog.Types>({
    Mapper: AuditLogMapper,
    Entity: AuditLog,
}) {
    public constructor(protected readonly readManager: ORM.EntityManager) {
        super();
    }
}

describe("BaseRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new TestRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("findUnique", () => {
        it("finds one entity or null by ORM where query", async () => {
            const auditLog = await suite.fixtures().createAuditLog();

            await expect(suite.repository().findUnique({ where: { id: auditLog.id } })).resolves.toMatchObject({
                id: auditLog.id,
                signature: "test-signature",
            });
            await expect(
                suite.repository().findUnique({
                    where: { id: "00000000-0000-0000-0000-000000000000" },
                }),
            ).resolves.toBeNull();
        });
    });

    describe("findUniqueOrThrow", () => {
        it("finds one required entity by ORM where query", async () => {
            const auditLog = await suite.fixtures().createAuditLog({
                actionType: ActionType.UPDATE,
            });

            await expect(suite.repository().findUniqueOrThrow({ where: { id: auditLog.id } })).resolves.toMatchObject({
                id: auditLog.id,
                actionType: ActionType.UPDATE,
            });
        });
    });

    describe("find", () => {
        it("finds all entities matching an ORM where query", async () => {
            await suite.fixtures().createAuditLog({ actionType: ActionType.CREATE });
            await suite.fixtures().createAuditLog({ actionType: ActionType.CREATE });
            await suite.fixtures().createAuditLog({ actionType: ActionType.DELETE });

            const entries = await suite.repository().find({
                where: { actionType: ActionType.CREATE },
            });

            expect(entries).toHaveLength(2);
            expect(entries.every(({ actionType }) => actionType === ActionType.CREATE)).toBe(true);
        });
    });

    describe("findMany", () => {
        it("finds and counts entities using explicit ORM where and options", async () => {
            await suite.fixtures().createAuditLog({ actionType: ActionType.CREATE });
            await suite.fixtures().createAuditLog({ actionType: ActionType.CREATE });

            const [entries, total] = await suite.repository().findMany({
                options: { orderBy: { createdAt: QueryOrder.ASC } },
                where: { actionType: ActionType.CREATE },
            });

            expect(total).toBe(2);
            expect(entries).toHaveLength(2);
        });

        it("finds and counts entities using mapper filters, sort and pagination", async () => {
            await suite.fixtures().createAuditLog({
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.CREATE,
            });
            await suite.fixtures().createAuditLog({
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.CREATE,
            });
            await suite.fixtures().createAuditLog({
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.UPDATE,
            });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 1 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    actionType: {
                        operator: PublicStringOperator.EQUAL,
                        value: ActionType.CREATE,
                    },
                },
            });

            expect(total).toBe(2);
            expect(entries).toHaveLength(1);
        });

        it("finds and counts entities using mapper filters combined with prefilter", async () => {
            await suite.fixtures().createAuditLog({
                actionType: ActionType.CREATE,
                entityType: EntityType.EMPLOYEE,
            });
            await suite.fixtures().createAuditLog({
                actionType: ActionType.UPDATE,
                entityType: EntityType.EMPLOYEE,
            });

            const [entries, total] = await suite.repository().findMany({
                prefilter: { entityType: EntityType.EMPLOYEE },
                filters: {
                    actionType: {
                        operator: PublicStringOperator.EQUAL,
                        value: ActionType.CREATE,
                    },
                },
                sort: { createdAt: QueryOrder.ASC },
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            expect(total).toBe(1);
            expect(entries[0]?.actionType).toBe(ActionType.CREATE);
        });

        it("keeps mapper pagination stable when creation timestamps are equal", async () => {
            const createdAt = new Date("2026-01-01T00:00:00.000Z");
            const first = await suite.fixtures().createAuditLog({ actionType: ActionType.DELETE, createdAt });
            const second = await suite.fixtures().createAuditLog({ actionType: ActionType.DELETE, createdAt });
            const third = await suite.fixtures().createAuditLog({ actionType: ActionType.DELETE, createdAt });
            const expectedIDs = [first, second, third]
                .sort((left, right) => left.id.localeCompare(right.id))
                .map(({ id }) => id);

            const [firstPage, total] = await suite.repository().findMany({
                filters: { actionType: { operator: PublicStringOperator.EQUAL, value: ActionType.DELETE } },
                pagination: { currentPage: 1, elementsPerPage: 2 },
                sort: { createdAt: QueryOrder.ASC },
            });
            const [secondPage] = await suite.repository().findMany({
                filters: { actionType: { operator: PublicStringOperator.EQUAL, value: ActionType.DELETE } },
                pagination: { currentPage: 2, elementsPerPage: 2 },
                sort: { createdAt: QueryOrder.ASC },
            });

            expect(total).toBe(expectedIDs.length);
            expect([...firstPage, ...secondPage].map(({ id }) => id)).toEqual(expectedIDs);
        });
    });
});
