import { describe, expect, it, jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

import {
    EmployeeStatus,
    HRRequestType,
    HRRequestStatus,
    HRApprovalStatus,
    HRExecutionStatus,
    PermissionCode,
} from "~context/enums";
import { HRRequestIntegrationHelpers } from "~testing/integration/domain-service/hr-request.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { PositionAssignment, HRRequest, HRApprovalStep, Employment, Employee } from "~context/domain/entities";

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

    describe("[Method] - beginLeave", () => {
        it("[case] - keeps SQL query count constant when the termination batch grows", async () => {
            // Arrange
            const measure = async (size: number): Promise<{ reads: number; writes: number }> => {
                const organization = await suite.fixtures().createOrganization();
                const workCalendar = await suite.fixtures().createWorkCalendar({ organization });
                const workSchedule = await suite.fixtures().createWorkSchedule({ organization });
                const leavePolicy = await suite.fixtures().createLeavePolicy({ organization });
                const requests = await Promise.all(
                    Array.from({ length: size }, async () => {
                        const employee = await suite.fixtures().createEmployee({
                            employmentStartedOn: "2026-01-01",
                            termsValidFrom: "2026-01-01",
                            status: EmployeeStatus.ACTIVE,
                            workCalendar,
                            workSchedule,
                            organization,
                            leavePolicy,
                        });
                        await suite.fixtures().createPositionAssignment({ employee, validFrom: "2026-01-01" });
                        return await suite.fixtures().createHRRequest({
                            payload: { employmentEndedOn: "2026-02-01" },
                            status: HRRequestStatus.APPROVED,
                            type: HRRequestType.TERMINATE,
                            approvedRevision: 1,
                            organization,
                            employee,
                        });
                    }),
                );

                // Act
                const queries = await suite.transaction(async (transaction) => {
                    const execute = jest.spyOn(transaction.getConnection(), "execute");
                    try {
                        const processed = await suite.repository().service.beginLeave({
                            identifiers: requests.map(({ id }) => id),
                            transaction,
                        });
                        expect(processed).toHaveLength(size);
                        expect(
                            processed.every(({ executionStatus }) => executionStatus === HRExecutionStatus.APPLIED),
                        ).toBe(true);
                        await transaction.flush();
                        return execute.mock.calls.map(([query]) => String(query));
                    } finally {
                        execute.mockRestore();
                    }
                });
                const assignments = await suite.transaction((transaction) =>
                    transaction.find(PositionAssignment, { organization: organization.id }),
                );
                expect(assignments).toHaveLength(size);
                expect(
                    assignments.every(
                        (assignment) =>
                            assignment.closedByRequest?.id ===
                            requests.find((request) => request.employee.id === assignment.employee.id)?.id,
                    ),
                ).toBe(true);
                expect(
                    await suite.transaction((transaction) =>
                        transaction.count(Employment, { organization: organization.id }),
                    ),
                ).toBe(size);
                return {
                    reads: queries.filter((query) => /^select /i.test(query)).length,
                    writes: queries.filter((query) => /^(insert|update|delete) /i.test(query)).length,
                };
            };
            const counts = [await measure(1), await measure(2), await measure(10)];

            // Assert
            expect(counts[0].reads).toBeGreaterThan(0);
            expect(counts[0].writes).toBeGreaterThan(0);
            expect(counts[2]).toEqual(counts[1]);
            expect(counts[1].reads).toBeLessThanOrEqual(counts[0].reads + 3);
            expect(counts[1].writes).toBe(counts[0].writes);
        });

        it("[case] - processes a mixed batch once and preserves future and running requests", async () => {
            // Arrange
            const kinds = ["linked", "unlinked", "invalid", "future", "running"];
            const requests = await Promise.all(
                kinds.map(async (kind) => {
                    const employee = await suite.fixtures().createEmployee({
                        account: kind === "unlinked" ? undefined : randomUUID(),
                        employmentStartedOn: "2026-01-01",
                        termsValidFrom: "2026-01-01",
                        status: EmployeeStatus.ACTIVE,
                    });
                    return await suite.fixtures().createHRRequest({
                        executionStatus: kind === "running" ? HRExecutionStatus.RUNNING : HRExecutionStatus.NOT_STARTED,
                        payload: { employmentEndedOn: kind === "invalid" ? "2026-02-30" : "2026-02-01" },
                        effectiveAt: kind === "future" ? new Date("2999-01-01T00:00:00Z") : undefined,
                        organization: employee.organization,
                        status: HRRequestStatus.APPROVED,
                        type: HRRequestType.TERMINATE,
                        approvedRevision: 1,
                        employee,
                    });
                }),
            );
            const identifiers = requests.map(({ id }) => id);

            // Act
            const processed = await suite.transaction((transaction) =>
                suite.repository().service.beginLeave({ identifiers, transaction }),
            );
            const repeated = await suite.transaction((transaction) =>
                suite.repository().service.beginLeave({ identifiers, transaction }),
            );
            const persisted = await suite.transaction((transaction) =>
                transaction.find(HRRequest, { id: { $in: identifiers } }),
            );
            const employee = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Employee, { id: requests[1].employee.id }),
            );
            const history = await suite.transaction((transaction) =>
                transaction.count(Employment, { employee: { id: requests[1].employee.id } }),
            );

            // Assert
            expect(processed).toHaveLength(3);
            expect(repeated).toEqual([]);
            expect(requests.map(({ id }) => persisted.find((request) => request.id === id)?.executionStatus)).toEqual([
                HRExecutionStatus.RUNNING,
                HRExecutionStatus.APPLIED,
                HRExecutionStatus.FAILED,
                HRExecutionStatus.NOT_STARTED,
                HRExecutionStatus.RUNNING,
            ]);
            expect(employee.status).toBe(EmployeeStatus.TERMINATED);
            expect(history).toBe(1);
        });
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

        it.each(["employee", "initiator", "type", "realm", "permission"])(
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
                        permissions: kind === "permission" ? [] : [PermissionCode.HR_REQUEST_UPDATE_PERSONAL],
                        realm: kind === "realm" ? randomUUID() : request.organization.realm,
                        patch: { payload: { reason: "Updated" } },
                        organization: request.organization.id,
                        id: request.id,
                        transaction,
                        actor,
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
