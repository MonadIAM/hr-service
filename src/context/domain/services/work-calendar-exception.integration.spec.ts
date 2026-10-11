import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { WorkCalendarExceptionIntegrationHelpers } from "~testing/integration/domain-service/work-calendar-exception.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { WorkCalendarException } from "~context/domain/entities";

const helpers = new WorkCalendarExceptionIntegrationHelpers();

describe("[DomainService] - WorkCalendarException", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Behavior] - calendar exceptions", () => {
        it("[case] - creates, updates and purges a calendar exception", async () => {
            // Arrange
            const calendar = await suite.fixtures().createWorkCalendar();

            // Act
            const created = await suite.transaction((transaction) =>
                suite.repository().service.create({
                    organization: calendar.organization.id,
                    transaction,
                    input: { calendar: calendar.id, date: "2026-12-25", name: "Holiday" },
                }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.update({
                    organization: calendar.organization.id,
                    id: created.id,
                    transaction,
                    patch: { name: "Updated" },
                }),
            );
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(WorkCalendarException, { id: created.id }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.purge({ organization: calendar.organization.id, id: created.id, transaction }),
            );

            // Assert
            expect(persisted).toMatchObject({ name: "Updated", date: "2026-12-25" });
            expect(
                await suite.transaction((transaction) => transaction.count(WorkCalendarException, { id: created.id })),
            ).toBe(0);
        });

        it("[case] - rejects a calendar from another organization without writing an exception", async () => {
            // Arrange
            const calendar = await suite.fixtures().createWorkCalendar();
            const organization = await suite.fixtures().createOrganization();

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.create({
                    organization: organization.id,
                    transaction,
                    input: { calendar: calendar.id, date: "2026-12-25", name: randomUUID() },
                }),
            );

            // Assert
            await expect(result).rejects.toThrow();
            expect(await suite.transaction((transaction) => transaction.count(WorkCalendarException, {}))).toBe(0);
        });
    });
});
