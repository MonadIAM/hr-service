import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { WorkCalendarIntegrationHelpers } from "~testing/integration/domain-service/work-calendar.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { WorkCalendar } from "~context/domain/entities";
import { HRExecutionStatus, HRRequestStatus, HRRequestType, RecordStatus } from "~context/enums";

const helpers = new WorkCalendarIntegrationHelpers();

describe("[DomainService] - WorkCalendar", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Behavior] - pending hire references", () => {
        it("[case] - protects a referenced record until the hire finishes", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkCalendar();
            await suite.fixtures().createHRRequest({
                executionStatus: HRExecutionStatus.RUNNING,
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.HIRE,
                organization: entity.organization,
                payload: { workCalendar: entity.id },
                approvedRevision: 1,
            });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.archive({
                    organization: entity.organization.id,
                    realm: entity.organization.realm,
                    id: entity.id,
                    transaction,
                }),
            );

            // Assert
            await expect(result).rejects.toThrow("services.work-calendar.HIRE_PENDING");
            const unchanged = await suite.transaction((transaction) => transaction.findOneOrFail(WorkCalendar, entity.id));
            expect(unchanged.status).toBe(RecordStatus.ACTIVE);
        });
    });

    describe("[Behavior] - persistence and organization isolation", () => {
        it("[case] - creates, archives, restores and purges a record", async () => {
            // Arrange
            const fixture = await suite.fixtures().createWorkCalendar();

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
                transaction.findOneOrFail(WorkCalendar, { id: created.id }),
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
                transaction.findOneOrFail(WorkCalendar, { id: created.id }),
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
            const remaining = await suite.transaction((transaction) => transaction.count(WorkCalendar, { id: created.id }));

            // Assert
            expect(archived.status).toBe(RecordStatus.ARCHIVED);
            expect(restored.status).toBe(RecordStatus.ACTIVE);
            expect(remaining).toBe(0);
        });

        it.each(["organization", "realm"])("[case] - rejects mutation from another %s", async (scope) => {
            // Arrange
            const entity = await suite.fixtures().createWorkCalendar();
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
                transaction.findOneOrFail(WorkCalendar, { id: entity.id }),
            );
            expect(persisted.status).toBe(RecordStatus.ACTIVE);
        });
    });

    describe("[Method] - update", () => {
        it("[case] - persists the updated name", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkCalendar();

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.update({
                    organization: entity.organization.id,
                    realm: entity.organization.realm,
                    patch: { name: "Updated" },
                    id: entity.id,
                    transaction,
                }),
            );

            // Assert
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(WorkCalendar, { id: entity.id }),
            );
            expect(persisted.name).toBe("Updated");
        });
    });
});
