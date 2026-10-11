import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { LockMode } from "@mikro-orm/core";

import { WorkCalendarExceptionUnitHelpers } from "~testing/unit/domain-service/work-calendar-exception.helpers";

const helpers = new WorkCalendarExceptionUnitHelpers();

describe("[DomainService] - WorkCalendarException", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it.each([true, false])("[case] - validates calendar organization (matches: %s)", async (matches) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createWorkCalendarException();
            repositories.organization.findUniqueOrThrow.mockResolvedValue(entity.organization);
            repositories.workCalendar.findUniqueOrThrow.mockResolvedValue(
                matches ? entity.calendar : helpers.createWorkCalendar(),
            );

            // Act
            const result = service.create({
                organization: entity.organization.id,
                transaction: transaction.entityManager,
                input: { ...entity, calendar: entity.calendar.id },
            });

            // Assert
            expect(repositories.workCalendar.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { id: entity.calendar.id, organization: entity.organization.id },
                transaction: transaction.entityManager,
            });
            if (matches) {
                expect(await result).toMatchObject({ calendar: entity.calendar, date: entity.date });
                expect(transaction.persist).toHaveBeenCalledWith(await result);
            } else {
                await expect(result).rejects.toThrow("entities.work-calendar-exception.ORGANIZATION_MISMATCH");
                expect(transaction.persist).not.toHaveBeenCalled();
            }
        });
    });

    describe("[Behavior] - mutation", () => {
        it.each(["update", "purge"] as const)(
            "[case] - locks and applies %s to the organization exception",
            async (method) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const entity = helpers.createWorkCalendarException();
                repositories.workCalendarException.findUniqueOrThrow.mockResolvedValue(entity);

                // Act
                const result = await service[method]({
                    organization: entity.organization.id,
                    id: entity.id,
                    transaction: transaction.entityManager,
                    patch: { name: "Updated" },
                });

                // Assert
                expect(result).toBe(entity);
                expect(repositories.workCalendarException.findUniqueOrThrow).toHaveBeenCalledWith({
                    where: { organization: entity.organization.id, id: entity.id },
                    transaction: transaction.entityManager,
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                });
                if (method === "update") {
                    expect(entity.name).toBe("Updated");
                } else {
                    expect(transaction.remove).toHaveBeenCalledWith(entity);
                }
            },
        );
    });
});
