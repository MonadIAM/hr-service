import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { WorkCalendarIntegrationHelpers } from "~testing/integration/domain-service/work-calendar.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { WorkCalendar } from "~context/domain/entities";
import { RecordStatus } from "~context/enums";

const helpers = new WorkCalendarIntegrationHelpers();

describe("[DomainService] - WorkCalendar", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Behavior] - persistence and organization isolation", () => {
        it("[case] - creates, archives, restores and purges a record", async () => {
            // Arrange
            const fixture = await suite.fixtures().createWorkCalendar();

            // Act
            const created = await suite.transaction((transaction) =>
                suite.repository().service.create({
                    organization: fixture.organization.id,
                    transaction,
                    input: { ...fixture, code: randomUUID() },
                }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.archive({ organization: fixture.organization.id, id: created.id, transaction }),
            );
            const archived = await suite.transaction((transaction) =>
                transaction.findOneOrFail(WorkCalendar, { id: created.id }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.restore({ organization: fixture.organization.id, id: created.id, transaction }),
            );
            const restored = await suite.transaction((transaction) =>
                transaction.findOneOrFail(WorkCalendar, { id: created.id }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.archive({ organization: fixture.organization.id, id: created.id, transaction }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.purge({ organization: fixture.organization.id, id: created.id, transaction }),
            );
            const remaining = await suite.transaction((transaction) => transaction.count(WorkCalendar, { id: created.id }));

            // Assert
            expect(archived.status).toBe(RecordStatus.ARCHIVED);
            expect(restored.status).toBe(RecordStatus.ACTIVE);
            expect(remaining).toBe(0);
        });

        it("[case] - rejects mutation from another organization", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkCalendar();
            const other = await suite.fixtures().createOrganization();

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.archive({ organization: other.id, id: entity.id, transaction }),
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
                    id: entity.id,
                    transaction,
                    patch: { name: "Updated" },
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
