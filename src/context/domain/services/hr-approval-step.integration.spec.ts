import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { HRApprovalStepIntegrationHelpers } from "~testing/integration/domain-service/hr-approval-step.helpers";
import { EmployeeStatus, HRRequestStatus, HRApprovalStatus, HRDecisionKind } from "~context/enums";
import { HRRequest, HRApprovalStep, HRApprovalDecision } from "~context/domain/entities";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";

const helpers = new HRApprovalStepIntegrationHelpers();

describe("[DomainService] - HRApprovalStep", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - decide", () => {
        it.each([
            {
                requestStatus: HRRequestStatus.SUBMITTED,
                stepStatus: HRApprovalStatus.APPROVED,
                decision: HRDecisionKind.APPROVE,
                hasNext: true,
            },
            {
                requestStatus: HRRequestStatus.APPROVED,
                stepStatus: HRApprovalStatus.APPROVED,
                decision: HRDecisionKind.APPROVE,
                hasNext: false,
            },
            {
                requestStatus: HRRequestStatus.REJECTED,
                stepStatus: HRApprovalStatus.REJECTED,
                decision: HRDecisionKind.REJECT,
                hasNext: true,
            },
            {
                stepStatus: HRApprovalStatus.RETURNED,
                requestStatus: HRRequestStatus.DRAFT,
                decision: HRDecisionKind.RETURN,
                hasNext: true,
            },
        ])(
            "[case] - commits $decision and workflow changes together (next: $hasNext)",
            async ({ decision, hasNext, stepStatus, requestStatus }) => {
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
                if (hasNext) {
                    await suite.fixtures().createHRApprovalStep({ request, assigneeEmployee: actor, ordinal: 2 });
                }

                // Act
                await suite.transaction((transaction) =>
                    suite.repository().service.decide({
                        organization: request.organization.id,
                        id: step.id,
                        actorEmployee: actor.id,
                        actorAccount: actor.account!,
                        decision,
                        transaction,
                    }),
                );
                const persistedRequest = await suite.transaction((transaction) =>
                    transaction.findOneOrFail(HRRequest, { id: request.id }),
                );
                const steps = await suite.transaction((transaction) =>
                    transaction.find(HRApprovalStep, { request: { id: request.id } }, { orderBy: { ordinal: "ASC" } }),
                );
                const decisions = await suite.transaction((transaction) =>
                    transaction.find(HRApprovalDecision, { step: { id: step.id } }),
                );

                // Assert
                expect(persistedRequest.status).toBe(requestStatus);
                expect(steps[0].status).toBe(stepStatus);
                if (hasNext) {
                    expect(steps[1].status).toBe(
                        decision === HRDecisionKind.APPROVE ? HRApprovalStatus.ACTIVE : HRApprovalStatus.SKIPPED,
                    );
                }
                expect(decisions).toHaveLength(1);
                expect(decisions[0]).toMatchObject({ decision, requestRevision: 1, actorAccount: actor.account });
                if (decision === HRDecisionKind.RETURN) {
                    expect(persistedRequest.revision).toBe(2);
                }
            },
        );

        it("[case] - rolls back the decision and approval when the next assignee is inactive", async () => {
            // Arrange
            const request = await suite.fixtures().createHRRequest({ status: HRRequestStatus.SUBMITTED });
            const actor = await suite.fixtures().createEmployee({
                organization: request.organization,
                status: EmployeeStatus.ACTIVE,
                account: randomUUID(),
            });
            const inactive = await suite.fixtures().createEmployee({ organization: request.organization });
            const step = await suite
                .fixtures()
                .createHRApprovalStep({ request, assigneeEmployee: actor, status: HRApprovalStatus.ACTIVE });
            await suite.fixtures().createHRApprovalStep({ request, assigneeEmployee: inactive, ordinal: 2 });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.decide({
                    organization: request.organization.id,
                    id: step.id,
                    actorEmployee: actor.id,
                    actorAccount: actor.account!,
                    decision: HRDecisionKind.APPROVE,
                    transaction,
                }),
            );

            // Assert
            await expect(result).rejects.toThrow("entities.hr-approval-step.INACTIVE_ASSIGNEE");
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(HRApprovalStep, { id: step.id }),
            );
            expect(persisted.status).toBe(HRApprovalStatus.ACTIVE);
            expect(await suite.transaction((transaction) => transaction.count(HRApprovalDecision, {}))).toBe(0);
            expect(
                (await suite.transaction((transaction) => transaction.findOneOrFail(HRRequest, { id: request.id }))).status,
            ).toBe(HRRequestStatus.SUBMITTED);
        });

        it("[case] - rejects a repeated decision without duplicating the decision record", async () => {
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
            const props = {
                organization: request.organization.id,
                id: step.id,
                actorEmployee: actor.id,
                actorAccount: actor.account!,
                decision: HRDecisionKind.APPROVE,
            };

            // Act
            await suite.transaction((transaction) => suite.repository().service.decide({ ...props, transaction }));
            const result = suite.transaction((transaction) => suite.repository().service.decide({ ...props, transaction }));

            // Assert
            await expect(result).rejects.toThrow("entities.hr-approval-decision.INVALID_REQUEST_STATUS");
            expect(await suite.transaction((transaction) => transaction.count(HRApprovalDecision, {}))).toBe(1);
        });
    });

    describe("[Method] - reassign", () => {
        it("[case] - persists the new assignee of the current step", async () => {
            // Arrange
            const request = await suite.fixtures().createHRRequest({ status: HRRequestStatus.SUBMITTED });
            const original = await suite
                .fixtures()
                .createEmployee({ organization: request.organization, status: EmployeeStatus.ACTIVE });
            const replacement = await suite
                .fixtures()
                .createEmployee({ organization: request.organization, status: EmployeeStatus.ACTIVE });
            const step = await suite.fixtures().createHRApprovalStep({ request, assigneeEmployee: original });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.reassign({
                    organization: request.organization.id,
                    id: step.id,
                    employee: replacement.id,
                    transaction,
                }),
            );

            // Assert
            expect(
                (await suite.transaction((transaction) => transaction.findOneOrFail(HRApprovalStep, { id: step.id })))
                    .assigneeEmployee.id,
            ).toBe(replacement.id);
        });
    });
});
