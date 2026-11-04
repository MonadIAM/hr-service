import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

import {
    HRRequestStatus,
    HRExecutionStatus,
    HRApprovalStatus,
    HRRequestType,
    EmployeeStatus,
    PermissionCode,
} from "~context/enums";
import { HRRequestUnitHelpers } from "~testing/unit/domain-service/hr-request.helpers";

const helpers = new HRRequestUnitHelpers();

const permissions = [
    PermissionCode.HR_REQUEST_WITHDRAW,
    PermissionCode.HR_REQUEST_CREATE,
    PermissionCode.HR_REQUEST_UPDATE,
    PermissionCode.HR_REQUEST_SUBMIT,
];

describe("[DomainService] - HRRequest", () => {
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

        it.each([undefined, "invalid", "2026-02-30", "2026-02-01T00:00:00Z"])(
            "[case] - fails an invalid date without stopping the batch: %s",
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
                expect(invalid.failure).toBe("services.hr-request.INVALID_TERMINATION_PAYLOAD");
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

    describe("[Method] - create", () => {
        it.each([true, false])("[case] - resolves optional request references (provided: %s)", async (provided) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createHRRequest();
            const position = helpers.createPosition({ organization: entity.organization });
            position.completePlacement(false);
            repositories.organization.findUniqueOrThrow.mockResolvedValue(entity.organization);
            repositories.employee.findUniqueOrThrow.mockResolvedValue(entity.employee);
            repositories.position.findUniqueOrThrow.mockResolvedValue(position);
            repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = await service.create({
                input: {
                    ...entity,
                    employee: entity.employee.id,
                    initiatorEmployee: provided ? entity.employee.id : undefined,
                    targetPosition: provided ? position.id : undefined,
                    relatedRequest: provided ? entity.id : undefined,
                },
                transaction: transaction.entityManager,
                organization: entity.organization.id,
                realm: entity.organization.realm,
                actor: entity.initiatorAccount,
                permissions,
            });

            // Assert
            expect(result).toMatchObject({
                status: HRRequestStatus.DRAFT,
                executionStatus: HRExecutionStatus.NOT_STARTED,
                revision: 1,
                employee: entity.employee,
            });
            expect(result.targetPosition).toBe(provided ? position : undefined);
            expect(result.relatedRequest).toBe(provided ? entity : undefined);
            expect(transaction.persist).toHaveBeenCalledWith(result);
            expect(repositories.organization.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { realm: entity.organization.realm, id: entity.organization.id },
                transaction: transaction.entityManager,
            });
            if (provided) {
                expect(repositories.employee.findUniqueOrThrow).toHaveBeenCalledWith({
                    where: {
                        account: entity.initiatorAccount,
                        id: entity.employee.id,
                        organization: entity.organization.id,
                    },
                    transaction: transaction.entityManager,
                });
            }
        });
    });

    describe("[Method] - update", () => {
        it("[case] - resolves target and related request before updating the draft", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createHRRequest();
            const related = helpers.createHRRequest({ employee: entity.employee });
            const position = helpers.createPosition({ organization: entity.organization });
            position.completePlacement(false);
            repositories.hrRequest.findUniqueOrThrow.mockResolvedValueOnce(entity).mockResolvedValueOnce(related);
            repositories.position.findUniqueOrThrow.mockResolvedValue(position);

            // Act
            const result = await service.update({
                patch: { targetPosition: position.id, relatedRequest: related.id },
                transaction: transaction.entityManager,
                organization: entity.organization.id,
                realm: entity.organization.realm,
                actor: entity.initiatorAccount,
                id: entity.id,
                permissions,
            });

            // Assert
            expect(result).toMatchObject({ revision: 2, targetPosition: position, relatedRequest: related });
            expect(repositories.hrRequest.findUniqueOrThrow).toHaveBeenNthCalledWith(1, {
                where: { organization: { realm: entity.organization.realm, id: entity.organization.id }, id: entity.id },
                options: { lockMode: expect.anything() },
                transaction: transaction.entityManager,
            });
        });
    });

    describe("[Method] - submit", () => {
        it("[case] - creates ordered steps and activates only the first", async () => {
            // Arrange
            const { service, repositories, transaction, services } = helpers.service();
            const entity = helpers.createHRRequest();
            const assignee = helpers.createEmployee({ organization: entity.organization, status: EmployeeStatus.ACTIVE });
            repositories.organization.findUniqueOrThrow.mockResolvedValue(entity.organization);
            repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(entity);
            repositories.employee.find.mockResolvedValue([assignee]);
            services.hrApprovalStep.create.mockImplementation(({ input, organization }) =>
                helpers.createHRApprovalStep({ ...input, organization }),
            );

            // Act
            const result = await service.submit({
                input: {
                    workflowCode: "leave",
                    workflowVersion: 1,
                    steps: [
                        { name: "Manager", assigneeEmployee: assignee.id },
                        { name: "HR", assigneeEmployee: assignee.id },
                    ],
                },
                transaction: transaction.entityManager,
                organization: entity.organization.id,
                realm: entity.organization.realm,
                actor: entity.initiatorAccount,
                id: entity.id,
                permissions,
            });

            // Assert
            expect(result.status).toBe(HRRequestStatus.SUBMITTED);
            expect(repositories.organization.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { realm: entity.organization.realm, id: entity.organization.id },
                transaction: transaction.entityManager,
            });
            expect(services.hrApprovalStep.create).toHaveBeenCalledTimes(2);
            expect(services.hrApprovalStep.create.mock.calls.map(([props]) => props.input.ordinal)).toEqual([1, 2]);
            expect(
                services.hrApprovalStep.create.mock.results.map(({ value }) => (value as Entities.HRApprovalStep).status),
            ).toEqual([HRApprovalStatus.ACTIVE, HRApprovalStatus.WAITING]);
        });

        it.each(["empty", "missing"])("[case] - rejects an %s approval route", async (state) => {
            // Arrange
            const { service, repositories, transaction, services } = helpers.service();
            const entity = helpers.createHRRequest();
            repositories.organization.findUniqueOrThrow.mockResolvedValue(entity.organization);
            repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = service.submit({
                input: {
                    workflowCode: "leave",
                    workflowVersion: 1,
                    steps: state === "empty" ? [] : [{ name: "Missing", assigneeEmployee: "missing" }],
                },
                transaction: transaction.entityManager,
                organization: entity.organization.id,
                realm: entity.organization.realm,
                actor: entity.initiatorAccount,
                id: entity.id,
                permissions,
            });

            // Assert
            await expect(result).rejects.toThrow(
                state === "empty" ? "services.hr-request.EMPTY_APPROVAL_ROUTE" : "services.hr-request.ASSIGNEE_NOT_FOUND",
            );
            expect(services.hrApprovalStep.create).not.toHaveBeenCalled();
        });
    });

    describe("[Method] - withdraw", () => {
        it("[case] - skips pending steps in the current revision", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createHRRequest({ status: HRRequestStatus.SUBMITTED });
            const step = helpers.createHRApprovalStep({ request: entity });
            repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(entity);
            repositories.hrApprovalStep.find.mockResolvedValue([step]);

            // Act
            await service.withdraw({
                transaction: transaction.entityManager,
                organization: entity.organization.id,
                realm: entity.organization.realm,
                actor: entity.initiatorAccount,
                id: entity.id,
                permissions,
            });

            // Assert
            expect(entity.status).toBe(HRRequestStatus.WITHDRAWN);
            expect(repositories.hrRequest.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { organization: { realm: entity.organization.realm, id: entity.organization.id }, id: entity.id },
                options: { lockMode: expect.anything() },
                transaction: transaction.entityManager,
            });
            expect(step.status).toBe(HRApprovalStatus.SKIPPED);
            expect(repositories.hrApprovalStep.find).toHaveBeenCalledWith({
                where: {
                    status: { $in: [HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE] },
                    requestRevision: entity.revision,
                    request: { id: entity.id },
                    organization: entity.organization.id,
                },
                options: { refresh: true },
                transaction: transaction.entityManager,
            });
        });
    });

    describe("[Behavior] - request lifecycle", () => {
        it.each(["approve", "reject", "returnForRevision"] as const)(
            "[case] - delegates %s to the locked request",
            async (method) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const entity = helpers.createHRRequest({ status: HRRequestStatus.SUBMITTED });
                repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(entity);
                const spy = jest.spyOn(entity, method);

                // Act
                const result = await service[method]({
                    organization: entity.organization.id,
                    id: entity.id,
                    transaction: transaction.entityManager,
                });

                // Assert
                expect(result).toBe(entity);
                expect(spy).toHaveBeenCalledTimes(1);
            },
        );

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
