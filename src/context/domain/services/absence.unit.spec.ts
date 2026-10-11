import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { AbsenceUnitHelpers } from "~testing/unit/domain-service/absence.helpers";
import { AbsenceStatus, HRRequestStatus, HRRequestType } from "~context/enums";

const helpers = new AbsenceUnitHelpers();

describe("[DomainService] - Absence", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it.each([true, false])("[case] - validates absence references before persistence (valid: %s)", async (valid) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const input = helpers.createAbsence();
            if (!valid) {
                input.employee = helpers.createEmployee();
            }
            repositories.organization.findUniqueOrThrow.mockResolvedValue(input.organization);

            // Act
            const result = service.create({
                organization: input.organization.id,
                transaction: transaction.entityManager,
                input,
            });

            // Assert
            if (valid) {
                expect(await result).toMatchObject({
                    status: AbsenceStatus.SCHEDULED,
                    sourceRequest: input.sourceRequest,
                    quantity: input.quantity,
                });
                expect(transaction.persist).toHaveBeenCalledWith(await result);
            } else {
                await expect(result).rejects.toThrow("entities.absence.ORGANIZATION_MISMATCH");
                expect(transaction.persist).not.toHaveBeenCalled();
            }
        });
    });

    describe("[Method] - advanceStatus", () => {
        it.each([
            ["2026-07-02T12:00:00Z", AbsenceStatus.IN_PROGRESS],
            ["2026-07-06T12:00:00Z", AbsenceStatus.COMPLETED],
        ])("[case] - advances at %s to %s", async (at, status) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createAbsence();
            repositories.absence.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = await service.advanceStatus({
                organization: entity.organization.id,
                id: entity.id,
                transaction: transaction.entityManager,
                at: new Date(at),
            });

            // Assert
            expect(result).toBe(entity);
            expect(entity.status).toBe(status);
        });
    });

    describe("[Method] - cancel", () => {
        it("[case] - resolves and records the approved cancellation request", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createAbsence();
            const request = helpers.createHRRequest({
                organization: entity.organization,
                employee: entity.employee,
                relatedRequest: entity.sourceRequest,
                type: HRRequestType.CANCEL_REQUEST,
                status: HRRequestStatus.APPROVED,
                approvedRevision: 1,
            });
            repositories.absence.findUniqueOrThrow.mockResolvedValue(entity);
            repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(request);

            // Act
            const result = await service.cancel({
                organization: entity.organization.id,
                id: entity.id,
                request: request.id,
                transaction: transaction.entityManager,
            });

            // Assert
            expect(result).toMatchObject({ status: AbsenceStatus.CANCELLED, cancelledByRequest: request });
            expect(repositories.hrRequest.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { id: request.id, organization: entity.organization.id },
                transaction: transaction.entityManager,
            });
        });
    });
});
