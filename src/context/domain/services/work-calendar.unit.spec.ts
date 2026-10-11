import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { LockMode } from "@mikro-orm/core";

import { WorkCalendarUnitHelpers } from "~testing/unit/domain-service/work-calendar.helpers";
import { RecordStatus } from "~context/enums";

const helpers = new WorkCalendarUnitHelpers();

describe("[DomainService] - WorkCalendar", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it("[case] - persists an active record in the resolved organization", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createWorkCalendar();
            repositories.organization.findUniqueOrThrow.mockResolvedValue(entity.organization);

            // Act
            const result = await service.create({
                organization: entity.organization.id,
                transaction: transaction.entityManager,
                input: entity,
            });

            // Assert
            expect(repositories.organization.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { id: entity.organization.id },
                transaction: transaction.entityManager,
            });
            expect(result).toMatchObject({
                code: entity.code,
                organization: entity.organization,
                status: RecordStatus.ACTIVE,
            });
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });
    });

    describe("[Behavior] - lifecycle", () => {
        it.each([
            { method: "archive", before: RecordStatus.ACTIVE, after: RecordStatus.ARCHIVED },
            { method: "restore", before: RecordStatus.ARCHIVED, after: RecordStatus.ACTIVE },
        ] as const)("[case] - locks and $method records in the organization", async ({ method, before, after }) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createWorkCalendar({ status: before });

            repositories.workCalendar.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = await service[method]({
                id: entity.id,
                organization: entity.organization.id,
                transaction: transaction.entityManager,
            });

            // Assert
            expect(result).toBe(entity);
            expect(entity.status).toBe(after);
            expect(repositories.workCalendar.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { id: entity.id, organization: entity.organization.id },
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                transaction: transaction.entityManager,
            });
        });
    });

    describe("[Method] - purge", () => {
        it.each([RecordStatus.ACTIVE, RecordStatus.ARCHIVED])(
            "[case] - enforces purge eligibility for %s",
            async (status) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const entity = helpers.createWorkCalendar({ status });

                repositories.workCalendar.findUniqueOrThrow.mockResolvedValue(entity);

                // Act
                const result = service.purge({
                    id: entity.id,
                    organization: entity.organization.id,
                    transaction: transaction.entityManager,
                });

                // Assert
                if (status === RecordStatus.ACTIVE) {
                    await expect(result).rejects.toThrow("entities.work-calendar.CANNOT_PURGE_ACTIVE");
                    expect(transaction.remove).not.toHaveBeenCalled();
                } else {
                    await expect(result).resolves.toBe(entity);
                    expect(transaction.remove).toHaveBeenCalledWith(entity);
                }
            },
        );
    });

    describe("[Method] - update", () => {
        it("[case] - applies a patch to the locked record", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createWorkCalendar();

            repositories.workCalendar.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = await service.update({
                id: entity.id,
                organization: entity.organization.id,
                transaction: transaction.entityManager,
                patch: { name: "Updated" },
            });

            // Assert
            expect(result).toBe(entity);
            expect(entity.name).toBe("Updated");
        });
    });
});
