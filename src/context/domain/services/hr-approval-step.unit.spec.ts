import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { HRRequestStatus, HRApprovalStatus, HRDecisionKind, EmployeeStatus } from "~context/enums";
import { HRApprovalStepUnitHelpers } from "~testing/unit/domain-service/hr-approval-step.helpers";

const helpers = new HRApprovalStepUnitHelpers();

describe("[DomainService] - HRApprovalStep", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it("[case] - persists a waiting step for the current request revision", () => {
            // Arrange
            const { service, transaction } = helpers.service();
            const request = helpers.createHRRequest({ revision: 3 });
            const assigneeEmployee = helpers.createEmployee({
                organization: request.organization,
                status: EmployeeStatus.ACTIVE,
            });

            // Act
            const result = service.create({
                organization: request.organization,
                transaction: transaction.entityManager,
                input: { request, assigneeEmployee, ordinal: 1, name: "Manager" },
            });

            // Assert
            expect(result).toMatchObject({
                requestRevision: 3,
                status: HRApprovalStatus.WAITING,
                request,
                assigneeEmployee,
            });
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });
    });

    describe("[Behavior] - step lifecycle", () => {
        it.each(["reassign", "activate", "skip"] as const)(
            "[case] - resolves the parent request before %s",
            async (method) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const request = helpers.createHRRequest({ status: HRRequestStatus.SUBMITTED });
                const assignee = helpers.createEmployee({
                    organization: request.organization,
                    status: EmployeeStatus.ACTIVE,
                });
                const entity = helpers.createHRApprovalStep({ request, assigneeEmployee: assignee });
                const replacement = helpers.createEmployee({
                    organization: request.organization,
                    status: EmployeeStatus.ACTIVE,
                });
                repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(request);
                repositories.hrApprovalStep.findUniqueOrThrow.mockResolvedValue(entity);
                repositories.employee.findUniqueOrThrow.mockResolvedValue(replacement);
                const spy = jest.spyOn(entity, method);

                // Act
                const result = await service[method]({
                    organization: request.organization.id,
                    id: entity.id,
                    employee: replacement.id,
                    transaction: transaction.entityManager,
                });

                // Assert
                expect(result).toBe(entity);
                expect(spy).toHaveBeenCalledTimes(1);
                expect(repositories.hrRequest.findUniqueOrThrow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: {
                            approvalSteps: { $some: { organization: request.organization.id, id: entity.id } },
                            organization: request.organization.id,
                        },
                        transaction: transaction.entityManager,
                    }),
                );
            },
        );
    });

    describe("[Method] - decide", () => {
        it.each([
            {
                requestStatus: HRRequestStatus.SUBMITTED,
                status: HRApprovalStatus.APPROVED,
                decision: HRDecisionKind.APPROVE,
                pending: true,
            },
            {
                requestStatus: HRRequestStatus.APPROVED,
                status: HRApprovalStatus.APPROVED,
                decision: HRDecisionKind.APPROVE,
                pending: false,
            },
            {
                requestStatus: HRRequestStatus.REJECTED,
                status: HRApprovalStatus.REJECTED,
                decision: HRDecisionKind.REJECT,
                pending: true,
            },
            {
                requestStatus: HRRequestStatus.DRAFT,
                status: HRApprovalStatus.RETURNED,
                decision: HRDecisionKind.RETURN,
                pending: true,
            },
        ])(
            "[case] - applies $decision with pending steps: $pending",
            async ({ decision, pending, status, requestStatus }) => {
                // Arrange
                const { service, repositories, transaction, services } = helpers.service();
                const request = helpers.createHRRequest({ status: HRRequestStatus.SUBMITTED });
                const actor = helpers.createEmployee({
                    organization: request.organization,
                    status: EmployeeStatus.ACTIVE,
                    account: "actor",
                });
                const entity = helpers.createHRApprovalStep({
                    request,
                    assigneeEmployee: actor,
                    status: HRApprovalStatus.ACTIVE,
                });
                const next = helpers.createHRApprovalStep({ request, assigneeEmployee: actor, ordinal: 2 });
                repositories.organization.findUniqueOrThrow.mockResolvedValue(request.organization);
                repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(request);
                repositories.employee.findUniqueOrThrow.mockResolvedValue(actor);
                repositories.hrApprovalStep.findUniqueOrThrow.mockResolvedValue(entity);
                repositories.hrApprovalStep.find.mockResolvedValue(pending ? [next] : []);

                // Act
                const result = await service.decide({
                    organization: request.organization.id,
                    id: entity.id,
                    actorEmployee: actor.id,
                    actorAccount: "actor",
                    decision,
                    comment: "Reviewed",
                    transaction: transaction.entityManager,
                });

                // Assert
                expect(result.status).toBe(status);
                expect(request.status).toBe(requestStatus);
                if (pending) {
                    expect(next.status).toBe(
                        decision === HRDecisionKind.APPROVE ? HRApprovalStatus.ACTIVE : HRApprovalStatus.SKIPPED,
                    );
                }
                expect(services.hrApprovalDecision.create.mock.calls[0][0]).toEqual({
                    organization: request.organization,
                    transaction: transaction.entityManager,
                    input: { actorEmployee: actor, actorAccount: "actor", comment: "Reviewed", step: entity, decision },
                });
                expect(repositories.hrApprovalStep.find).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: {
                            status: { $in: [HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE] },
                            requestRevision: 1,
                            request: { id: request.id },
                            id: { $ne: entity.id },
                            organization: request.organization.id,
                        },
                    }),
                );
            },
        );

        it("[case] - leaves the workflow untouched when decision validation fails", async () => {
            // Arrange
            const { service, repositories, transaction, services } = helpers.service();
            const request = helpers.createHRRequest({ status: HRRequestStatus.SUBMITTED });
            const actor = helpers.createEmployee({ organization: request.organization, status: EmployeeStatus.ACTIVE });
            const entity = helpers.createHRApprovalStep({
                request,
                assigneeEmployee: actor,
                status: HRApprovalStatus.ACTIVE,
            });
            repositories.organization.findUniqueOrThrow.mockResolvedValue(request.organization);
            repositories.hrRequest.findUniqueOrThrow.mockResolvedValue(request);
            repositories.employee.findUniqueOrThrow.mockResolvedValue(actor);
            repositories.hrApprovalStep.findUniqueOrThrow.mockResolvedValue(entity);
            services.hrApprovalDecision.create.mockImplementation(() => {
                throw new Error("invalid actor");
            });

            // Act
            const result = service.decide({
                organization: request.organization.id,
                id: entity.id,
                actorEmployee: actor.id,
                actorAccount: "wrong",
                decision: HRDecisionKind.APPROVE,
                transaction: transaction.entityManager,
            });

            // Assert
            await expect(result).rejects.toThrow("invalid actor");
            expect(entity.status).toBe(HRApprovalStatus.ACTIVE);
            expect(request.status).toBe(HRRequestStatus.SUBMITTED);
        });
    });
});
