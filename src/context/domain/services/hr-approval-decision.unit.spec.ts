import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { HRApprovalDecisionUnitHelpers } from "~testing/unit/domain-service/hr-approval-decision.helpers";
import { HRApprovalStatus, HRRequestStatus, EmployeeStatus, HRDecisionKind } from "~context/enums";

const helpers = new HRApprovalDecisionUnitHelpers();

describe("[DomainService] - HRApprovalDecision", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it.each([true, false])("[case] - validates the deciding actor before persisting (valid: %s)", (valid) => {
            // Arrange
            const { service, transaction } = helpers.service();
            const request = helpers.createHRRequest({ status: HRRequestStatus.SUBMITTED });
            const actor = helpers.createEmployee({
                organization: request.organization,
                status: EmployeeStatus.ACTIVE,
                account: "actor-account",
            });
            const step = helpers.createHRApprovalStep({
                request,
                assigneeEmployee: actor,
                status: HRApprovalStatus.ACTIVE,
            });
            const input = {
                step,
                actorEmployee: actor,
                actorAccount: valid ? actor.account! : "wrong-account",
                decision: HRDecisionKind.APPROVE,
            };

            // Act
            const action = (): Entities.HRApprovalDecision =>
                service.create({ organization: request.organization, input, transaction: transaction.entityManager });

            // Assert
            if (valid) {
                const result = action();
                expect(result).toMatchObject({
                    request: request.id,
                    requestRevision: request.revision,
                    actorEmployee: actor,
                    decision: HRDecisionKind.APPROVE,
                });
                expect(result.decidedAt).toBeInstanceOf(Date);
                expect(transaction.persist).toHaveBeenCalledWith(result);
            } else {
                expect(action).toThrow("entities.hr-approval-decision.INVALID_ACTOR");
                expect(transaction.persist).not.toHaveBeenCalled();
            }
        });
    });
});
