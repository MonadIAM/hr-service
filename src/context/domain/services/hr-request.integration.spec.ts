import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { EmployeeStatus, HRRequestStatus, HRApprovalStatus, HRExecutionStatus } from "~context/enums";
import { HRRequestIntegrationHelpers } from "~testing/integration/domain-service/hr-request.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { HRRequest, HRApprovalStep } from "~context/domain/entities";

const helpers = new HRRequestIntegrationHelpers();

describe("[DomainService] - HRRequest", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - submit", () => {
        it("[case] - persists ordered approval steps and withdraws the current route", async () => {
            // Arrange
            const request = await suite.fixtures().createHRRequest();
            const assignee = await suite
                .fixtures()
                .createEmployee({ organization: request.organization, status: EmployeeStatus.ACTIVE });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.submit({
                    organization: request.organization.id,
                    id: request.id,
                    transaction,
                    input: {
                        workflowCode: "leave",
                        workflowVersion: 1,
                        steps: [
                            { name: "Manager", assigneeEmployee: assignee.id },
                            { name: "HR", assigneeEmployee: assignee.id },
                        ],
                    },
                }),
            );
            const steps = await suite.transaction((transaction) =>
                transaction.find(HRApprovalStep, { request: { id: request.id } }, { orderBy: { ordinal: "ASC" } }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.withdraw({ organization: request.organization.id, id: request.id, transaction }),
            );
            const withdrawn = await suite.transaction((transaction) =>
                transaction.findOneOrFail(HRRequest, { id: request.id }),
            );
            const skipped = await suite.transaction((transaction) =>
                transaction.find(HRApprovalStep, { request: { id: request.id } }),
            );

            // Assert
            expect(steps.map((step) => [step.ordinal, step.status])).toEqual([
                [1, HRApprovalStatus.ACTIVE],
                [2, HRApprovalStatus.WAITING],
            ]);
            expect(withdrawn.status).toBe(HRRequestStatus.WITHDRAWN);
            expect(skipped.map((step) => step.status)).toEqual([HRApprovalStatus.SKIPPED, HRApprovalStatus.SKIPPED]);
        });

        it.each(["missing", "foreign", "inactive"])(
            "[case] - rolls back submission and earlier steps when an assignee is %s",
            async (kind) => {
                // Arrange
                const request = await suite.fixtures().createHRRequest();
                const assignee = await suite
                    .fixtures()
                    .createEmployee({ organization: request.organization, status: EmployeeStatus.ACTIVE });
                const invalid =
                    kind === "missing"
                        ? undefined
                        : await suite.fixtures().createEmployee({
                              organization: kind === "foreign" ? undefined : request.organization,
                              status: kind === "inactive" ? EmployeeStatus.DRAFT : EmployeeStatus.ACTIVE,
                          });

                // Act
                const result = suite.transaction((transaction) =>
                    suite.repository().service.submit({
                        organization: request.organization.id,
                        id: request.id,
                        transaction,
                        input: {
                            workflowCode: "leave",
                            workflowVersion: 1,
                            steps: [
                                { name: "Manager", assigneeEmployee: assignee.id },
                                { name: "Invalid", assigneeEmployee: invalid?.id ?? randomUUID() },
                            ],
                        },
                    }),
                );

                // Assert
                await expect(result).rejects.toThrow(
                    kind === "inactive"
                        ? "entities.hr-approval-step.INACTIVE_ASSIGNEE"
                        : "services.hr-request.ASSIGNEE_NOT_FOUND",
                );
                const persisted = await suite.transaction((transaction) =>
                    transaction.findOneOrFail(HRRequest, { id: request.id }),
                );
                expect(persisted.status).toBe(HRRequestStatus.DRAFT);
                expect(persisted.workflowCode).toBeFalsy();
                expect(
                    await suite.transaction((transaction) =>
                        transaction.count(HRApprovalStep, { request: { id: request.id } }),
                    ),
                ).toBe(0);
            },
        );
    });

    describe("[Behavior] - request execution", () => {
        it("[case] - persists approval, failure, retry and application results", async () => {
            // Arrange
            const request = await suite.fixtures().createHRRequest({ status: HRRequestStatus.SUBMITTED });
            const props = { organization: request.organization.id, id: request.id };

            // Act
            await suite.transaction((transaction) => suite.repository().service.approve({ ...props, transaction }));
            await suite.transaction((transaction) =>
                suite.repository().service.scheduleApplication({
                    ...props,
                    transaction,
                    input: { effectiveAt: new Date("2026-01-01T00:00:00Z") },
                }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.beginApplication({ ...props, transaction }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.markFailed({ ...props, transaction, input: { reason: "Temporary failure" } }),
            );
            const failed = await suite.transaction((transaction) =>
                transaction.findOneOrFail(HRRequest, { id: request.id }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.beginApplication({ ...props, transaction }),
            );
            await suite.transaction((transaction) =>
                suite
                    .repository()
                    .service.markApplied({ ...props, transaction, input: { result: { absence: "created" } } }),
            );
            const applied = await suite.transaction((transaction) =>
                transaction.findOneOrFail(HRRequest, { id: request.id }),
            );

            // Assert
            expect(failed).toMatchObject({ executionStatus: HRExecutionStatus.FAILED, failure: "Temporary failure" });
            expect(applied).toMatchObject({
                status: HRRequestStatus.APPROVED,
                executionStatus: HRExecutionStatus.APPLIED,
                approvedRevision: 1,
                appliedRevision: 1,
                result: { absence: "created" },
            });
            expect(applied.failure).toBeFalsy();
        });

        it("[case] - rejects access from another organization", async () => {
            // Arrange
            const request = await suite.fixtures().createHRRequest({ status: HRRequestStatus.SUBMITTED });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.approve({ organization: randomUUID(), id: request.id, transaction }),
            );

            // Assert
            await expect(result).rejects.toThrow();
            expect(
                (await suite.transaction((transaction) => transaction.findOneOrFail(HRRequest, { id: request.id }))).status,
            ).toBe(HRRequestStatus.SUBMITTED);
        });
    });
});
