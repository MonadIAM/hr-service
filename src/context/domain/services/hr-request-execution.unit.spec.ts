import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { HRExecutionStatus, HRRequestStatus, HRRequestType, EmployeeStatus } from "~context/enums";
import { HRRequestExecutionUnitHelpers } from "~testing/unit/domain-service/hr-request-execution.helpers";

const helpers = new HRRequestExecutionUnitHelpers();

describe("[DomainService] - HRRequestExecution", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Behavior] - membership leave", () => {
        it.each([true, false])("[case] - starts a batch with linked accounts: %s", async (linked) => {
            // Arrange
            const { service, repositories, transaction, services } = helpers.service();
            const requests = Array.from({ length: 2 }, () => {
                const employee = helpers.createEmployee({
                    employmentStartedOn: "2026-01-01",
                    termsValidFrom: "2026-01-01",
                    account: linked ? randomUUID() : undefined,
                    status: EmployeeStatus.ACTIVE,
                });
                return helpers.createHRRequest({
                    payload: { employmentEndedOn: "2026-02-01" },
                    status: HRRequestStatus.APPROVED,
                    type: HRRequestType.TERMINATE,
                    approvedRevision: 1,
                    employee,
                });
            });
            repositories.hrRequest.find.mockResolvedValue(requests);
            repositories.employee.find.mockResolvedValue(requests.map(({ employee }) => employee));

            // Act
            const result = await service.beginLeave({
                transaction: transaction.entityManager,
                identifiers: requests.map(({ id }) => id),
            });

            // Assert
            expect(result).toEqual(requests);
            expect(requests.map(({ executionStatus }) => executionStatus)).toEqual(
                Array(2).fill(linked ? HRExecutionStatus.RUNNING : HRExecutionStatus.APPLIED),
            );
            expect(repositories.hrRequest.find).toHaveBeenCalledTimes(1);
            expect(repositories.hrRequest.findUniqueOrThrow).not.toHaveBeenCalled();
            expect(services.employee.terminate).toHaveBeenCalledTimes(linked ? 0 : 2);
            expect(repositories.positionAssignment.find).toHaveBeenCalledTimes(linked ? 0 : 1);
            expect(repositories.employee.find).toHaveBeenCalledTimes(linked ? 0 : 1);
        });

        it("[case] - selects only due approved requests that have not started", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const identifiers = [randomUUID(), randomUUID()];

            // Act
            const result = await service.beginLeave({ transaction: transaction.entityManager, identifiers });

            // Assert
            expect(result).toEqual([]);
            expect(repositories.hrRequest.find).toHaveBeenCalledWith({
                options: expect.objectContaining({ refresh: true }),
                where: {
                    executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                    $or: [{ effectiveAt: { $lte: expect.any(Date) } }, { effectiveAt: null }],
                    status: HRRequestStatus.APPROVED,
                    type: HRRequestType.TERMINATE,
                    id: { $in: identifiers },
                },
                transaction: transaction.entityManager,
            });
        });

        it.each(["2025-12-30", "2025-12-31"])(
            "[case] - fails termination before employment started without stopping the batch: %s",
            async (employmentEndedOn) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const employee = helpers.createEmployee({
                    employmentStartedOn: "2026-01-01",
                    termsValidFrom: "2026-01-01",
                    status: EmployeeStatus.ACTIVE,
                    account: randomUUID(),
                });
                const valid = helpers.createHRRequest({
                    payload: { employmentEndedOn: "2026-02-01" },
                    status: HRRequestStatus.APPROVED,
                    type: HRRequestType.TERMINATE,
                    approvedRevision: 1,
                    employee,
                });
                const invalid = helpers.createHRRequest({
                    status: HRRequestStatus.APPROVED,
                    type: HRRequestType.TERMINATE,
                    payload: { employmentEndedOn },
                    approvedRevision: 1,
                    employee,
                });
                repositories.hrRequest.find.mockResolvedValue([invalid, valid]);

                // Act
                await service.beginLeave({
                    transaction: transaction.entityManager,
                    identifiers: [invalid.id, valid.id],
                });

                // Assert
                expect(valid.executionStatus).toBe(HRExecutionStatus.RUNNING);
                expect(invalid.executionStatus).toBe(HRExecutionStatus.FAILED);
                expect(invalid.failure).toBe("entities.employee.INVALID_PERIOD");
                expect(employee.status).toBe(EmployeeStatus.ACTIVE);
            },
        );

        it.each(["confirmLeave", "rejectLeave"] as const)("[case] - handles %s only once", async (operation) => {
            // Arrange
            const { service, repositories, transaction, services } = helpers.service();
            const request = helpers.createHRRequest({
                payload: { employmentEndedOn: "2026-02-01" },
                executionStatus: HRExecutionStatus.RUNNING,
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.TERMINATE,
                approvedRevision: 1,
            });
            repositories.hrRequest.findUnique.mockResolvedValue(request);
            services.employee.terminate.mockReturnValue(request.employee);
            repositories.employee.findUniqueOrThrow.mockResolvedValue(request.employee);
            const props = {
                input: {
                    organization: request.organization.id,
                    process: request.id,
                    account: randomUUID(),
                    reason: "Owner cannot leave",
                },
                transaction: transaction.entityManager,
                actor: request.initiatorAccount,
                realm: request.organization.realm,
            };

            // Act
            await service[operation](props);
            await service[operation](props);

            // Assert
            expect(request.executionStatus).toBe(
                operation === "confirmLeave" ? HRExecutionStatus.APPLIED : HRExecutionStatus.FAILED,
            );
            expect(services.employee.terminate).toHaveBeenCalledTimes(operation === "confirmLeave" ? 1 : 0);
            expect(repositories.hrRequest.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        organization: { id: props.input.organization, realm: props.realm },
                        employee: { account: props.input.account },
                        type: HRRequestType.TERMINATE,
                        id: request.id,
                    },
                }),
            );
        });
    });

    describe("[Behavior] - execution lifecycle", () => {
        it.each(["cancel", "scheduleApplication", "beginApplication", "markApplied", "markFailed"] as const)(
            "[case] - delegates execution transition %s",
            async (method) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const entity = helpers.createHRRequest({
                    status: HRRequestStatus.APPROVED,
                    approvedRevision: 1,
                    executionStatus:
                        method === "markApplied" || method === "markFailed"
                            ? HRExecutionStatus.RUNNING
                            : HRExecutionStatus.NOT_STARTED,
                });
                repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(entity);
                const spy = jest.spyOn(entity, method);

                // Act
                const result = await service[method]({
                    organization: entity.organization.id,
                    id: entity.id,
                    transaction: transaction.entityManager,
                    input: { effectiveAt: new Date("2026-01-01T00:00:00Z"), result: { ok: true }, reason: "Failure" },
                });

                // Assert
                expect(result).toBe(entity);
                expect(spy).toHaveBeenCalledTimes(1);
            },
        );
    });
});
