import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { HRRequestStatus, HRExecutionStatus, HRApprovalStatus, EmployeeStatus } from "~context/enums";
import { HRRequestUnitHelpers } from "~testing/unit/domain-service/hr-request.helpers";

const helpers = new HRRequestUnitHelpers();

describe("[DomainService] - HRRequest", () => {
    afterEach(() => {
        jest.restoreAllMocks();
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
                organization: entity.organization.id,
                transaction: transaction.entityManager,
                input: {
                    ...entity,
                    employee: entity.employee.id,
                    initiatorEmployee: provided ? entity.employee.id : undefined,
                    targetPosition: provided ? position.id : undefined,
                    relatedRequest: provided ? entity.id : undefined,
                },
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
                organization: entity.organization.id,
                id: entity.id,
                transaction: transaction.entityManager,
                patch: { targetPosition: position.id, relatedRequest: related.id },
            });

            // Assert
            expect(result).toMatchObject({ revision: 2, targetPosition: position, relatedRequest: related });
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
                organization: entity.organization.id,
                id: entity.id,
                transaction: transaction.entityManager,
                input: {
                    workflowCode: "leave",
                    workflowVersion: 1,
                    steps: [
                        { name: "Manager", assigneeEmployee: assignee.id },
                        { name: "HR", assigneeEmployee: assignee.id },
                    ],
                },
            });

            // Assert
            expect(result.status).toBe(HRRequestStatus.SUBMITTED);
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
                organization: entity.organization.id,
                id: entity.id,
                transaction: transaction.entityManager,
                input: {
                    workflowCode: "leave",
                    workflowVersion: 1,
                    steps: state === "empty" ? [] : [{ name: "Missing", assigneeEmployee: "missing" }],
                },
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
                organization: entity.organization.id,
                id: entity.id,
                transaction: transaction.entityManager,
            });

            // Assert
            expect(entity.status).toBe(HRRequestStatus.WITHDRAWN);
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
