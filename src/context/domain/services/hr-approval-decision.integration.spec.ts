import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { HRApprovalDecisionIntegrationHelpers } from "~testing/integration/domain-service/hr-approval-decision.helpers";
import { EmployeeStatus, HRRequestStatus, HRApprovalStatus, HRDecisionKind } from "~context/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { HRApprovalDecision } from "~context/domain/entities";

const helpers = new HRApprovalDecisionIntegrationHelpers();

describe("[DomainService] - HRApprovalDecision", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - create", () => {
        it.each([true, false])("[case] - persists only a decision from the assigned actor (valid: %s)", async (valid) => {
            // Arrange
            const request = await suite.fixtures().createHRRequest({ status: HRRequestStatus.SUBMITTED });
            const actor = await suite.fixtures().createEmployee({
                organization: request.organization,
                status: EmployeeStatus.ACTIVE,
                account: randomUUID(),
            });
            const step = await suite
                .fixtures()
                .createHRApprovalStep({ request, assigneeEmployee: actor, status: HRApprovalStatus.ACTIVE });

            // Act
            const result = suite.transaction((transaction) => {
                const entity = suite.repository().service.create({
                    organization: request.organization,
                    transaction,
                    input: {
                        step,
                        actorEmployee: actor,
                        actorAccount: valid ? actor.account! : randomUUID(),
                        decision: HRDecisionKind.APPROVE,
                    },
                });
                return Promise.resolve(entity);
            });

            // Assert
            if (valid) {
                const created = await result;
                const persisted = await suite.transaction((transaction) =>
                    transaction.findOneOrFail(HRApprovalDecision, { id: created.id }),
                );
                expect(persisted).toMatchObject({
                    request: request.id,
                    requestRevision: 1,
                    actorAccount: actor.account,
                    decision: HRDecisionKind.APPROVE,
                });
                expect(persisted.step.id).toBe(step.id);
            } else {
                await expect(result).rejects.toThrow("entities.hr-approval-decision.INVALID_ACTOR");
                expect(await suite.transaction((transaction) => transaction.count(HRApprovalDecision, {}))).toBe(0);
            }
        });
    });
});
