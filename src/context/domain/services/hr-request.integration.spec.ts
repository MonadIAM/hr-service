import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { EmployeeStatus, HRRequestType, HRRequestStatus, HRApprovalStatus, PermissionCode } from "~context/enums";
import { HRRequestIntegrationHelpers } from "~testing/integration/domain-service/hr-request.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { HRRequest, HRApprovalStep } from "~context/domain/entities";

const helpers = new HRRequestIntegrationHelpers();

const permissions = [
    PermissionCode.HR_REQUEST_WITHDRAW,
    PermissionCode.HR_REQUEST_CREATE,
    PermissionCode.HR_REQUEST_UPDATE,
    PermissionCode.HR_REQUEST_SUBMIT,
];

describe("[DomainService] - HRRequest", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Behavior] - personal requests", () => {
        it.each([HRRequestType.ABSENCE, HRRequestType.OVERTIME, HRRequestType.CANCEL_REQUEST])(
            "[case] - updates an owned %s request",
            async (type) => {
                // Arrange
                const actor = randomUUID();
                const employee = await suite.fixtures().createEmployee({ account: actor });
                const relatedRequest =
                    type === HRRequestType.CANCEL_REQUEST
                        ? await suite.fixtures().createHRRequest({ employee, organization: employee.organization })
                        : undefined;
                const request = await suite.fixtures().createHRRequest({
                    organization: employee.organization,
                    initiatorAccount: actor,
                    relatedRequest,
                    employee,
                    type,
                });

                // Act
                await suite.transaction((transaction) =>
                    suite.repository().service.update({
                        permissions: [PermissionCode.HR_REQUEST_UPDATE_PERSONAL],
                        patch: { payload: { reason: "Updated" } },
                        organization: request.organization.id,
                        realm: request.organization.realm,
                        id: request.id,
                        transaction,
                        actor,
                        type: request.type,
                    }),
                );
                const persisted = await suite.transaction((transaction) =>
                    transaction.findOneOrFail(HRRequest, { id: request.id }),
                );

                // Assert
                expect(persisted.payload).toEqual({ reason: "Updated" });
                expect(persisted.revision).toBe(2);
            },
        );

        it.each(["employee", "initiator", "type", "realm", "permission", "payload-type"])(
            "[case] - rejects a personal update with a mismatched %s",
            async (kind) => {
                // Arrange
                const actor = randomUUID();
                const employee = await suite.fixtures().createEmployee({
                    account: kind === "employee" ? randomUUID() : actor,
                });
                const request = await suite.fixtures().createHRRequest({
                    initiatorAccount: kind === "initiator" ? randomUUID() : actor,
                    type: kind === "type" ? HRRequestType.HIRE : HRRequestType.ABSENCE,
                    organization: employee.organization,
                    employee,
                });

                // Act
                const result = suite.transaction((transaction) =>
                    suite.repository().service.update({
                        permissions:
                            kind === "permission"
                                ? []
                                : [
                                      kind === "payload-type"
                                          ? PermissionCode.HR_REQUEST_UPDATE
                                          : PermissionCode.HR_REQUEST_UPDATE_PERSONAL,
                                  ],
                        realm: kind === "realm" ? randomUUID() : request.organization.realm,
                        patch: { payload: { reason: "Updated" } },
                        organization: request.organization.id,
                        id: request.id,
                        transaction,
                        actor,
                        type: kind === "payload-type" ? HRRequestType.OVERTIME : request.type,
                    }),
                );

                // Assert
                await expect(result).rejects.toThrow();
                const persisted = await suite.transaction((transaction) =>
                    transaction.findOneOrFail(HRRequest, { id: request.id }),
                );
                expect(persisted.payload).toEqual(request.payload);
                expect(persisted.revision).toBe(1);
            },
        );
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
                    input: {
                        workflowCode: "leave",
                        workflowVersion: 1,
                        steps: [
                            { name: "Manager", assigneeEmployee: assignee.id },
                            { name: "HR", assigneeEmployee: assignee.id },
                        ],
                    },
                    organization: request.organization.id,
                    realm: request.organization.realm,
                    actor: request.initiatorAccount,
                    id: request.id,
                    permissions,
                    transaction,
                }),
            );
            const steps = await suite.transaction((transaction) =>
                transaction.find(HRApprovalStep, { request: { id: request.id } }, { orderBy: { ordinal: "ASC" } }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.withdraw({
                    organization: request.organization.id,
                    realm: request.organization.realm,
                    actor: request.initiatorAccount,
                    id: request.id,
                    permissions,
                    transaction,
                }),
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
                        input: {
                            workflowCode: "leave",
                            workflowVersion: 1,
                            steps: [
                                { name: "Manager", assigneeEmployee: assignee.id },
                                { name: "Invalid", assigneeEmployee: invalid?.id ?? randomUUID() },
                            ],
                        },
                        organization: request.organization.id,
                        realm: request.organization.realm,
                        actor: request.initiatorAccount,
                        id: request.id,
                        permissions,
                        transaction,
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

    describe("[Behavior] - request approval", () => {
        it("[case] - persists approval of the current revision", async () => {
            // Arrange
            const request = await suite.fixtures().createHRRequest({ status: HRRequestStatus.SUBMITTED });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.approve({
                    organization: request.organization.id,
                    id: request.id,
                    transaction,
                }),
            );
            const approved = await suite.transaction((transaction) =>
                transaction.findOneOrFail(HRRequest, { id: request.id }),
            );

            // Assert
            expect(approved).toMatchObject({ status: HRRequestStatus.APPROVED, approvedRevision: request.revision });
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
