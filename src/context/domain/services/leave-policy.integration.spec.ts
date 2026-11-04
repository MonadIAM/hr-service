import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { LeavePolicyIntegrationHelpers } from "~testing/integration/domain-service/leave-policy.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { LeavePolicy } from "~context/domain/entities";
import { RecordStatus } from "~context/enums";

const helpers = new LeavePolicyIntegrationHelpers();

describe("[DomainService] - LeavePolicy", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Behavior] - persistence and organization isolation", () => {
        it("[case] - creates, archives, restores and purges a record", async () => {
            // Arrange
            const fixture = await suite.fixtures().createLeavePolicy();

            // Act
            const created = await suite.transaction((transaction) =>
                suite.repository().service.create({
                    input: { ...fixture, code: randomUUID() },
                    organization: fixture.organization.id,
                    realm: fixture.organization.realm,
                    transaction,
                }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.archive({
                    organization: fixture.organization.id,
                    realm: fixture.organization.realm,
                    id: created.id,
                    transaction,
                }),
            );
            const archived = await suite.transaction((transaction) =>
                transaction.findOneOrFail(LeavePolicy, { id: created.id }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.restore({
                    organization: fixture.organization.id,
                    realm: fixture.organization.realm,
                    id: created.id,
                    transaction,
                }),
            );
            const restored = await suite.transaction((transaction) =>
                transaction.findOneOrFail(LeavePolicy, { id: created.id }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.archive({
                    organization: fixture.organization.id,
                    realm: fixture.organization.realm,
                    id: created.id,
                    transaction,
                }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.purge({
                    organization: fixture.organization.id,
                    realm: fixture.organization.realm,
                    id: created.id,
                    transaction,
                }),
            );
            const remaining = await suite.transaction((transaction) => transaction.count(LeavePolicy, { id: created.id }));

            // Assert
            expect(archived.status).toBe(RecordStatus.ARCHIVED);
            expect(restored.status).toBe(RecordStatus.ACTIVE);
            expect(remaining).toBe(0);
        });

        it.each(["organization", "realm"])("[case] - rejects mutation from another %s", async (scope) => {
            // Arrange
            const entity = await suite.fixtures().createLeavePolicy();
            const other = await suite.fixtures().createOrganization();

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.archive({
                    organization: scope === "organization" ? other.id : entity.organization.id,
                    realm: other.realm,
                    id: entity.id,
                    transaction,
                }),
            );

            // Assert
            await expect(result).rejects.toThrow();
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(LeavePolicy, { id: entity.id }),
            );
            expect(persisted.status).toBe(RecordStatus.ACTIVE);
        });
    });

    describe("[Method] - createRevision", () => {
        it("[case] - persists revisions and rejects another revision from stale input", async () => {
            // Arrange
            const entity = await suite.fixtures().createLeavePolicy();

            // Act
            const revision = await suite.transaction((transaction) =>
                suite.repository().service.createRevision({
                    organization: entity.organization.id,
                    realm: entity.organization.realm,
                    input: { name: "Updated" },
                    id: entity.id,
                    transaction,
                }),
            );
            const result = suite.transaction((transaction) =>
                suite.repository().service.createRevision({
                    organization: entity.organization.id,
                    realm: entity.organization.realm,
                    input: { name: "Stale" },
                    id: entity.id,
                    transaction,
                }),
            );

            // Assert
            await expect(result).rejects.toThrow("services.leave-policy.STALE_REVISION");
            const persisted = await suite.transaction((transaction) =>
                transaction.find(
                    LeavePolicy,
                    { organization: entity.organization.id, code: entity.code },
                    { orderBy: { revision: "ASC" } },
                ),
            );
            expect(persisted.map((record) => [record.revision, record.name])).toEqual([
                [1, entity.name],
                [2, "Updated"],
            ]);
            expect(revision.id).not.toBe(entity.id);
        });
    });
});
