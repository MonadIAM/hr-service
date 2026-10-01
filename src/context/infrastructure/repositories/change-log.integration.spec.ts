import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { ChangeSetType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { DeltaChanges } from "~common/transaction-manager/value-objects";
import { PublicStringOperator } from "~infrastructure/database/enums";
import { EntityType } from "~context/enums";

import { ChangeLogRepository } from "./change-log.repository";

describe("ChangeLogRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new ChangeLogRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("maps the persisted change log entry through the schema", async () => {
            const entity = randomUUID();
            const changeLog = await suite.fixtures().createChangeLog({
                delta: new DeltaChanges({ name: { old: "Old Name", new: "New Name" } }),
                changeType: ChangeSetType.UPDATE,
                entityType: EntityType.EXAMPLE,
                entity,
            });

            await expect(suite.repository().findUniqueOrThrow({ where: { id: changeLog.id } })).resolves.toMatchObject({
                delta: new DeltaChanges({ name: { old: "Old Name", new: "New Name" } }),
                auditEntry: changeLog.auditEntry,
                changeType: ChangeSetType.UPDATE,
                signature: changeLog.signature,
                keyVersion: changeLog.keyVersion,
                createdAt: changeLog.createdAt,
                entityType: EntityType.EXAMPLE,
                id: changeLog.id,
                entity,
            });
        });

        it("persists a joined composite entity id in the text column", async () => {
            const entity = `${randomUUID()}:${randomUUID()}:1`;
            const changeLog = await suite.fixtures().createChangeLog({ entity });

            await expect(suite.repository().findUniqueOrThrow({ where: { id: changeLog.id } })).resolves.toMatchObject({
                entity,
            });
        });
    });

    describe("findMany", () => {
        it("finds change log entries by change type and entity mapper filters", async () => {
            const matched = await suite.fixtures().createChangeLog({
                changeType: ChangeSetType.CREATE,
                entityType: EntityType.EXAMPLE,
            });
            await suite.fixtures().createChangeLog({
                changeType: ChangeSetType.UPDATE,
                entityType: EntityType.EXAMPLE,
            });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    changeType: {
                        operator: PublicStringOperator.EQUAL,
                        value: ChangeSetType.CREATE,
                    },
                    entityType: {
                        operator: PublicStringOperator.EQUAL,
                        value: EntityType.EXAMPLE,
                    },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });
    });
});
