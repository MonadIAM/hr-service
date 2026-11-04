import { describe, expect, it, jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { RecordStatus, EmployeeStatus, HRRequestType, HRRequestStatus, HRExecutionStatus } from "~context/enums";
import { HRRequestExecutionIntegrationHelpers } from "~testing/integration/domain-service/hr-request-execution.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { PositionAssignment, HRRequest, Employment, Employee } from "~context/domain/entities";

const helpers = new HRRequestExecutionIntegrationHelpers();

describe("[DomainService] - HRRequestExecution", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - changeTerms", () => {
        it("[case] - applies partial terms once and preserves history and unrelated fields", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const workCalendar = await suite.fixtures().createWorkCalendar({ organization });
            const workSchedule = await suite.fixtures().createWorkSchedule({ organization });
            const leavePolicy = await suite.fixtures().createLeavePolicy({ organization });
            const employee = await suite.fixtures().createEmployee({
                employmentStartedOn: "2026-01-01",
                scheduleAnchorDate: "2026-01-05",
                scheduleTimezone: "Europe/London",
                termsValidFrom: "2026-01-01",
                contractEndsOn: "2026-12-31",
                contractType: "fixed-term",
                status: EmployeeStatus.ACTIVE,
                workCalendar,
                workSchedule,
                organization,
                leavePolicy,
            });
            const request = await suite.fixtures().createHRRequest({
                payload: { termsValidFrom: "2026-02-01", contractEndsOn: null, contractType: "permanent" },
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.CHANGE_TERMS,
                approvedRevision: 1,
                organization,
                employee,
            });
            const identifiers = [request.id];

            // Act
            await suite.transaction((transaction) => suite.repository().service.changeTerms({ identifiers, transaction }));
            const repeated = await suite.transaction((transaction) =>
                suite.repository().service.changeTerms({ identifiers, transaction }),
            );
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Employee, { id: employee.id }),
            );
            const history = await suite.transaction((transaction) =>
                transaction.find(Employment, { employee: { id: employee.id } }),
            );
            const applied = await suite.transaction((transaction) =>
                transaction.findOneOrFail(HRRequest, { id: request.id }),
            );

            // Assert
            expect(repeated).toEqual([]);
            expect(persisted).toMatchObject({
                employmentStartedOn: "2026-01-01",
                scheduleAnchorDate: "2026-01-05",
                scheduleTimezone: "Europe/London",
                termsValidFrom: "2026-02-01",
                contractType: "permanent",
                termsRevision: 2,
                workCalendar: { id: workCalendar.id },
                workSchedule: { id: workSchedule.id },
                leavePolicy: { id: leavePolicy.id },
            });
            expect(persisted.contractEndsOn).toBeFalsy();
            expect(history).toHaveLength(1);
            expect(history[0]).toMatchObject({
                replacedByRequest: { id: request.id },
                termsSnapshot: { contractType: "fixed-term", contractEndsOn: "2026-12-31" },
                validFrom: "2026-01-01",
                validTo: "2026-02-01",
                termsRevision: 1,
            });
            expect(applied).toMatchObject({
                result: { termsRevision: 2, employee: employee.id },
                executionStatus: HRExecutionStatus.APPLIED,
                appliedRevision: 1,
            });
        });

        it("[case] - isolates invalid operations and references without applying future or unapproved requests", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const workCalendar = await suite.fixtures().createWorkCalendar({ organization });
            const workSchedule = await suite.fixtures().createWorkSchedule({ organization });
            const leavePolicy = await suite.fixtures().createLeavePolicy({ organization });
            const foreign = await suite.fixtures().createWorkCalendar();
            const archived = await suite.fixtures().createWorkCalendar({ organization, status: RecordStatus.ARCHIVED });
            const kinds = ["valid", "missing", "foreign", "archived", "inactive", "period", "future", "draft"];
            const requests = await Promise.all(
                kinds.map(async (kind) => {
                    const employee = await suite.fixtures().createEmployee({
                        status: kind === "inactive" ? EmployeeStatus.TERMINATED : EmployeeStatus.ACTIVE,
                        employmentStartedOn: "2026-01-01",
                        scheduleTimezone: "Europe/London",
                        termsValidFrom: "2026-01-01",
                        contractType: "permanent",
                        workCalendar,
                        workSchedule,
                        organization,
                        leavePolicy,
                    });
                    const payload: UnknownObject = { termsValidFrom: "2026-02-01", contractType: "fixed-term" };
                    if (kind === "missing") {
                        payload.workCalendar = randomUUID();
                    }
                    if (kind === "foreign") {
                        payload.workCalendar = foreign.id;
                    }
                    if (kind === "archived") {
                        payload.workCalendar = archived.id;
                    }
                    if (kind === "period") {
                        payload.termsValidFrom = "2025-12-31";
                    }
                    return await suite.fixtures().createHRRequest({
                        effectiveAt: kind === "future" ? new Date("2999-01-01T00:00:00Z") : undefined,
                        status: kind === "draft" ? HRRequestStatus.DRAFT : HRRequestStatus.APPROVED,
                        approvedRevision: kind === "draft" ? undefined : 1,
                        payloadSchemaVersion: 1,
                        type: HRRequestType.CHANGE_TERMS,
                        organization,
                        employee,
                        payload,
                    });
                }),
            );

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.changeTerms({
                    identifiers: requests.map(({ id }) => id),
                    transaction,
                }),
            );
            const persisted = await suite.transaction((transaction) =>
                transaction.find(HRRequest, { organization: organization.id }),
            );
            const employees = await suite.transaction((transaction) =>
                transaction.find(Employee, { organization: organization.id }),
            );
            const history = await suite.transaction((transaction) =>
                transaction.count(Employment, { organization: organization.id }),
            );

            // Assert
            for (const [index, kind] of kinds.entries()) {
                expect(persisted.find(({ id }) => id === requests[index].id)?.executionStatus).toBe(
                    kind === "valid"
                        ? HRExecutionStatus.APPLIED
                        : ["future", "draft"].includes(kind)
                          ? HRExecutionStatus.NOT_STARTED
                          : HRExecutionStatus.FAILED,
                );
                expect(employees.find(({ id }) => id === requests[index].employee.id)?.termsRevision).toBe(
                    kind === "valid" ? 2 : 1,
                );
            }
            expect(history).toBe(1);
        });

        it("[case] - keeps SQL count constant when changing references for a growing batch", async () => {
            // Arrange
            const measure = async (size: number): Promise<{ reads: number; writes: number }> => {
                const organization = await suite.fixtures().createOrganization();
                const calendar = await suite.fixtures().createWorkCalendar({ organization });
                const schedule = await suite.fixtures().createWorkSchedule({ organization });
                const policy = await suite.fixtures().createLeavePolicy({ organization });
                const workCalendar = await suite.fixtures().createWorkCalendar({ organization });
                const workSchedule = await suite.fixtures().createWorkSchedule({ organization });
                const leavePolicy = await suite.fixtures().createLeavePolicy({ organization });
                const requests = await Promise.all(
                    Array.from({ length: size }, async () => {
                        const employee = await suite.fixtures().createEmployee({
                            employmentStartedOn: "2026-01-01",
                            scheduleTimezone: "Europe/London",
                            termsValidFrom: "2026-01-01",
                            status: EmployeeStatus.ACTIVE,
                            workCalendar,
                            workSchedule,
                            organization,
                            leavePolicy,
                        });
                        return await suite.fixtures().createHRRequest({
                            payload: {
                                termsValidFrom: "2026-02-01",
                                workCalendar: calendar.id,
                                workSchedule: schedule.id,
                                leavePolicy: policy.id,
                            },
                            status: HRRequestStatus.APPROVED,
                            type: HRRequestType.CHANGE_TERMS,
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
                        await suite
                            .repository()
                            .service.changeTerms({ identifiers: requests.map(({ id }) => id), transaction });
                        await transaction.flush();
                        return execute.mock.calls.map(([query]) => String(query));
                    } finally {
                        execute.mockRestore();
                    }
                });
                const employees = await suite.transaction((transaction) =>
                    transaction.find(Employee, { organization: organization.id }),
                );
                expect(employees).toHaveLength(size);
                expect(
                    employees.every(
                        (employee) =>
                            employee.termsRevision === 2 &&
                            employee.workCalendar?.id === calendar.id &&
                            employee.workSchedule?.id === schedule.id &&
                            employee.leavePolicy?.id === policy.id,
                    ),
                ).toBe(true);
                return {
                    reads: queries.filter((query) => /^select /i.test(query)).length,
                    writes: queries.filter((query) => /^(insert|update|delete) /i.test(query)).length,
                };
            };
            const counts = [await measure(1), await measure(2), await measure(10), await measure(100)];

            // Assert
            expect(counts[0].reads).toBeGreaterThan(0);
            expect(counts[0].writes).toBeGreaterThan(0);
            expect(counts[2]).toEqual(counts[1]);
            expect(counts[3]).toEqual(counts[1]);
            expect(counts[1].reads).toBeLessThanOrEqual(counts[0].reads + 2);
            expect(counts[1].writes).toBe(counts[0].writes);
        });

        it("[case] - rolls back both employee terms and execution state when the batch fails", async () => {
            // Arrange
            const employee = await suite.fixtures().createEmployee({
                employmentStartedOn: "2026-01-01",
                scheduleTimezone: "Europe/London",
                termsValidFrom: "2026-01-01",
                status: EmployeeStatus.ACTIVE,
            });
            const organization = employee.organization;
            const workCalendar = await suite.fixtures().createWorkCalendar({ organization });
            const workSchedule = await suite.fixtures().createWorkSchedule({ organization });
            const leavePolicy = await suite.fixtures().createLeavePolicy({ organization });
            const request = await suite.fixtures().createHRRequest({
                payload: {
                    termsValidFrom: "2026-02-01",
                    workCalendar: workCalendar.id,
                    workSchedule: workSchedule.id,
                    leavePolicy: leavePolicy.id,
                },
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.CHANGE_TERMS,
                approvedRevision: 1,
                organization,
                employee,
            });

            // Act
            const result = suite.transaction(async (transaction) => {
                await suite.repository().service.changeTerms({ identifiers: [request.id], transaction });
                await transaction.flush();
                throw new Error("rollback");
            });

            // Assert
            await expect(result).rejects.toThrow("rollback");
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Employee, { id: employee.id }),
            );
            const pending = await suite.transaction((transaction) =>
                transaction.findOneOrFail(HRRequest, { id: request.id }),
            );
            expect(persisted.termsRevision).toBe(1);
            expect(pending.executionStatus).toBe(HRExecutionStatus.NOT_STARTED);
            expect(
                await suite.transaction((transaction) => transaction.count(Employment, { employee: { id: employee.id } })),
            ).toBe(0);
        });
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
                        payload: { employmentEndedOn: kind === "invalid" ? "2025-12-31" : "2026-02-01" },
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

    describe("[Behavior] - request execution", () => {
        it("[case] - persists failure, retry and application results", async () => {
            // Arrange
            const request = await suite
                .fixtures()
                .createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 1 });
            const props = { organization: request.organization.id, id: request.id };

            // Act
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
    });
});
