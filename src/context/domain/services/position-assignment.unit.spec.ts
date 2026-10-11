import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { PositionAssignmentUnitHelpers } from "~testing/unit/domain-service/position-assignment.helpers";
import { EmployeeStatus, PositionAssignmentStatus } from "~context/enums";

const helpers = new PositionAssignmentUnitHelpers();

describe("[DomainService] - PositionAssignment", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Behavior] - assignment creation", () => {
        it.each(["create", "transfer"] as const)(
            "[case] - resolves references and snapshots placement on %s",
            async (method) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const employee = helpers.createEmployee({ status: EmployeeStatus.ACTIVE });
                const position = helpers.createPosition({
                    organization: employee.organization,
                    title: "New title",
                    grade: "L2",
                });
                position.completePlacement(false);
                const current = helpers.createPositionAssignment({ employee });
                const request = helpers.createHRRequest({ employee });
                repositories.organization.findUniqueOrThrow.mockResolvedValue(employee.organization);
                repositories.employee.findUniqueOrThrow.mockResolvedValue(employee);
                repositories.position.findUniqueOrThrow.mockResolvedValue(position);
                repositories.positionAssignment.findUniqueOrThrow.mockResolvedValue(current);
                repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(request);

                // Act
                const result = await service[method]({
                    organization: employee.organization.id,
                    id: current.id,
                    transaction: transaction.entityManager,
                    input: {
                        employee: employee.id,
                        position: position.id,
                        sourceRequest: request.id,
                        validFrom: "2026-07-01",
                        fte: "0.5",
                    },
                });

                // Assert
                expect(result).toMatchObject({
                    employee,
                    position,
                    sourceRequest: request,
                    positionTitle: "New title",
                    grade: "L2",
                    department: position.department,
                    team: position.team,
                    status: PositionAssignmentStatus.ACTIVE,
                    placementSnapshot: {
                        department: position.department,
                        title: position.title,
                        grade: position.grade,
                        code: position.code,
                        team: position.team,
                    },
                });
                expect(transaction.persist).toHaveBeenCalledWith(result);
                expect(repositories.hrRequest.findUniqueOrThrow).toHaveBeenCalledWith({
                    where: { employee: { id: employee.id }, id: request.id, organization: employee.organization.id },
                    transaction: transaction.entityManager,
                });
                if (method === "transfer") {
                    expect(current).toMatchObject({
                        status: PositionAssignmentStatus.CLOSED,
                        validTo: "2026-07-01",
                        closedByRequest: request,
                    });
                    expect(transaction.flush).toHaveBeenCalledTimes(1);
                    expect(transaction.flush.mock.invocationCallOrder[0]).toBeLessThan(
                        transaction.persist.mock.invocationCallOrder[0],
                    );
                } else {
                    expect(transaction.flush).not.toHaveBeenCalled();
                }
            },
        );

        it("[case] - rejects inactive references before persisting", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const employee = helpers.createEmployee();
            const position = helpers.createPosition({ organization: employee.organization });
            position.completePlacement(false);
            repositories.organization.findUniqueOrThrow.mockResolvedValue(employee.organization);
            repositories.employee.findUniqueOrThrow.mockResolvedValue(employee);
            repositories.position.findUniqueOrThrow.mockResolvedValue(position);

            // Act
            const result = service.create({
                organization: employee.organization.id,
                transaction: transaction.entityManager,
                input: { employee: employee.id, position: position.id, validFrom: "2026-01-01", fte: "1" },
            });

            // Assert
            await expect(result).rejects.toThrow("entities.position-assignment.INACTIVE_REFERENCE");
            expect(transaction.persist).not.toHaveBeenCalled();
            expect(repositories.hrRequest.findUniqueOrThrow).not.toHaveBeenCalled();
        });
    });

    describe("[Behavior] - assignment closure", () => {
        it.each(["close", "void"] as const)("[case] - applies %s to an existing assignment", async (method) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createPositionAssignment();
            repositories.positionAssignment.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = await service[method]({
                organization: entity.organization.id,
                id: entity.id,
                transaction: transaction.entityManager,
                validTo: "2026-07-01",
            });

            // Assert
            expect(result).toBe(entity);
            expect(entity.status).toBe(
                method === "close" ? PositionAssignmentStatus.CLOSED : PositionAssignmentStatus.VOIDED,
            );
        });
    });
});
