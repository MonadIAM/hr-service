import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { LockMode } from "@mikro-orm/core";

import { EmployeeUnitHelpers } from "~testing/unit/domain-service/employee.helpers";
import { EmployeeStatus, PositionAssignmentStatus } from "~context/enums";

const helpers = new EmployeeUnitHelpers();

describe("[DomainService] - Employee", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it("[case] - creates a draft with the first terms revision", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const organization = helpers.createOrganization();
            repositories.organization.findUniqueOrThrow.mockResolvedValue(organization);

            // Act
            const result = await service.create({
                organization: organization.id,
                transaction: transaction.entityManager,
                input: { employeeNumber: "EMP-1", firstName: "Alice", lastName: "Morgan" },
            });

            // Assert
            expect(result).toMatchObject({
                organization,
                employeeNumber: "EMP-1",
                status: EmployeeStatus.DRAFT,
                termsRevision: 1,
            });
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });
    });

    describe("[Behavior] - personal data", () => {
        it.each(["update", "linkAccount", "unlinkAccount", "archive", "restore"] as const)(
            "[case] - locks the employee before %s",
            async (method) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const entity = helpers.createEmployee({
                    status: method === "restore" ? EmployeeStatus.ARCHIVED : EmployeeStatus.DRAFT,
                    account: method === "unlinkAccount" ? "account" : undefined,
                });
                repositories.employee.findUniqueOrThrow.mockResolvedValue(entity);
                const spy = jest.spyOn(entity, method);

                // Act
                const result = await service[method]({
                    organization: entity.organization.id,
                    id: entity.id,
                    transaction: transaction.entityManager,
                    patch: { firstName: "Updated" },
                    account: "new-account",
                });

                // Assert
                expect(result).toBe(entity);
                expect(spy).toHaveBeenCalledTimes(1);
                expect(repositories.employee.findUniqueOrThrow).toHaveBeenCalledWith({
                    where: { organization: entity.organization.id, id: entity.id },
                    transaction: transaction.entityManager,
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                });
            },
        );
    });

    describe("[Method] - setHRBP", () => {
        it.each([true, false])("[case] - resolves an optional HR partner (provided: %s)", async (provided) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createEmployee();
            const partner = helpers.createEmployee({ organization: entity.organization, status: EmployeeStatus.ACTIVE });
            repositories.employee.findUniqueOrThrow.mockResolvedValueOnce(entity).mockResolvedValueOnce(partner);

            // Act
            const result = await service.setHRBP({
                organization: entity.organization.id,
                id: entity.id,
                employee: provided ? partner.id : undefined,
                transaction: transaction.entityManager,
            });

            // Assert
            expect(result.hrBpEmployee).toBe(provided ? partner : undefined);
            expect(repositories.employee.findUniqueOrThrow).toHaveBeenCalledTimes(provided ? 2 : 1);
        });
    });

    describe("[Behavior] - employment terms", () => {
        it.each(["hire", "changeTerms"] as const)("[case] - resolves terms and applies %s", async (method) => {
            // Arrange
            const { service, repositories, transaction, services } = helpers.service();
            const organization = helpers.createOrganization();
            const workCalendar = helpers.createWorkCalendar({ organization });
            const workSchedule = helpers.createWorkSchedule({ organization });
            const leavePolicy = helpers.createLeavePolicy({ organization });
            const entity = helpers.createEmployee({
                organization,
                status: method === "hire" ? EmployeeStatus.DRAFT : EmployeeStatus.ACTIVE,
                termsValidFrom: "2026-01-01",
                workCalendar,
                workSchedule,
                leavePolicy,
                contractType: "old-contract",
            });
            repositories.organization.findUniqueOrThrow.mockResolvedValue(organization);
            repositories.employee.findUniqueOrThrow.mockResolvedValue(entity);
            repositories.workCalendar.findUniqueOrThrow.mockResolvedValue(workCalendar);
            repositories.workSchedule.findUniqueOrThrow.mockResolvedValue(workSchedule);
            repositories.leavePolicy.findUniqueOrThrow.mockResolvedValue(leavePolicy);

            // Act
            const result = await service[method]({
                organization: organization.id,
                id: entity.id,
                transaction: transaction.entityManager,
                input: {
                    workCalendar: workCalendar.id,
                    workSchedule: workSchedule.id,
                    leavePolicy: leavePolicy.id,
                    termsValidFrom: "2026-02-01",
                    employmentStartedOn: "2026-02-01",
                    scheduleTimezone: "Europe/London",
                    contractType: "new-contract",
                },
            });

            // Assert
            expect(result).toMatchObject({
                status: EmployeeStatus.ACTIVE,
                workCalendar,
                workSchedule,
                leavePolicy,
                contractType: "new-contract",
                termsRevision: method === "hire" ? 1 : 2,
            });
            for (const [repository, record] of [
                [repositories.workCalendar, workCalendar],
                [repositories.workSchedule, workSchedule],
                [repositories.leavePolicy, leavePolicy],
            ] as const) {
                expect(repository.findUniqueOrThrow).toHaveBeenCalledWith({
                    where: { id: record.id, organization: organization.id },
                    transaction: transaction.entityManager,
                });
            }
            if (method === "changeTerms") {
                expect(services.employment.create).toHaveBeenCalledWith({
                    organization,
                    transaction: transaction.entityManager,
                    input: expect.objectContaining({
                        termsRevision: 1,
                        validFrom: "2026-01-01",
                        validTo: "2026-02-01",
                        termsSnapshot: expect.objectContaining({ contractType: "old-contract" }),
                    }),
                });
                expect(services.employment.create.mock.calls[0][0].input).not.toHaveProperty("organization");
            } else {
                expect(services.employment.create).not.toHaveBeenCalled();
            }
        });
    });

    describe("[Method] - terminate", () => {
        it("[case] - snapshots previous terms and closes active assignments", async () => {
            // Arrange
            const { service, repositories, transaction, services } = helpers.service();
            const entity = helpers.createEmployee({
                status: EmployeeStatus.ACTIVE,
                employmentStartedOn: "2026-01-01",
                termsValidFrom: "2026-01-01",
            });
            const assignment = helpers.createPositionAssignment({ employee: entity });
            const request = helpers.createHRRequest({ employee: entity });
            repositories.organization.findUniqueOrThrow.mockResolvedValue(entity.organization);
            repositories.employee.findUniqueOrThrow.mockResolvedValue(entity);
            repositories.positionAssignment.find.mockResolvedValue([assignment]);
            repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(request);

            // Act
            const result = await service.terminate({
                organization: entity.organization.id,
                id: entity.id,
                request: request.id,
                transaction: transaction.entityManager,
                input: { employmentEndedOn: "2026-07-01" },
            });

            // Assert
            expect(result.status).toBe(EmployeeStatus.TERMINATED);
            expect(services.employment.create.mock.calls[0][0].input).not.toHaveProperty("organization");
            expect(assignment).toMatchObject({
                status: PositionAssignmentStatus.CLOSED,
                validTo: "2026-07-01",
                closedByRequest: request,
            });
            expect(services.employment.create).toHaveBeenCalledWith({
                organization: entity.organization,
                transaction: transaction.entityManager,
                input: expect.objectContaining({
                    termsRevision: 1,
                    replacedByRequest: request,
                    validTo: "2026-07-01",
                    termsSnapshot: expect.objectContaining({ status: EmployeeStatus.ACTIVE }),
                }),
            });
            expect(repositories.positionAssignment.find).toHaveBeenCalledWith({
                where: {
                    status: PositionAssignmentStatus.ACTIVE,
                    employee: { id: entity.id },
                    organization: entity.organization.id,
                },
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                transaction: transaction.entityManager,
            });
        });
    });
});
