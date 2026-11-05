import { describe, expect, it, jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { HRRequestExecutionIntegrationHelpers } from "~testing/integration/domain-service/hr-request-execution.helpers";
import { PositionAssignment, HRRequest, Employment, Employee, Position } from "~context/domain/entities";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import {
    PositionAssignmentStatus,
    HRExecutionStatus,
    HRRequestStatus,
    EmployeeStatus,
    HRRequestType,
    RecordStatus,
} from "~context/enums";

const helpers = new HRRequestExecutionIntegrationHelpers();

describe("[DomainService] - HRRequestExecution", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Behavior] - hire and rehire execution", () => {
        async function createBatch(
            count: number,
            type: HRRequestType.HIRE | HRRequestType.REHIRE = HRRequestType.HIRE,
        ): Promise<HRRequest<HRRequestType.HIRE | HRRequestType.REHIRE>[]> {
            const organization = await suite.fixtures().createOrganization();
            const workCalendar = await suite.fixtures().createWorkCalendar({ organization });
            const workSchedule = await suite.fixtures().createWorkSchedule({ organization });
            const leavePolicy = await suite.fixtures().createLeavePolicy({ organization });

            return await suite.transaction(async (transaction) => {
                const requests = Array.from({ length: count }, () => {
                    const employee = new Employee({
                        employmentEndedOn: type === HRRequestType.REHIRE ? "2026-01-31" : undefined,
                        status: type === HRRequestType.REHIRE ? EmployeeStatus.TERMINATED : EmployeeStatus.DRAFT,
                        employeeNumber: randomUUID(),
                        termsRevision: type === HRRequestType.REHIRE ? 2 : 1,
                        firstName: "Alice",
                        lastName: "Morgan",
                        account: randomUUID(),
                        organization,
                    });
                    const position = new Position({
                        department: randomUUID(),
                        status: RecordStatus.ACTIVE,
                        plannedFte: "1",
                        title: "Engineer",
                        team: randomUUID(),
                        code: randomUUID(),
                        organization,
                    });
                    position.completePlacement(false);
                    const request = new HRRequest({
                        executionStatus: HRExecutionStatus.NOT_STARTED,
                        payloadSchemaVersion: 1,
                        initiatorAccount: randomUUID(),
                        status: HRRequestStatus.APPROVED,
                        idempotencyKey: randomUUID(),
                        approvedRevision: 1,
                        targetPosition: position,
                        revision: 1,
                        organization,
                        employee,
                        payload: {
                            employmentStartedOn: "2026-02-01",
                            scheduleTimezone: "Europe/London",
                            termsValidFrom: "2026-02-01",
                            workCalendar: workCalendar.id,
                            workSchedule: workSchedule.id,
                            leavePolicy: leavePolicy.id,
                            position: position.id,
                            fte: "1",
                        },
                        type,
                    });
                    transaction.persist([employee, position, request]);

                    return request;
                });
                await transaction.flush();

                return requests;
            });
        }

        it.each([HRRequestType.HIRE, HRRequestType.REHIRE] as const)(
            "[case] - reserves %s until membership confirmation and ignores repeated outcomes",
            async (type) => {
                // Arrange
                const [request] = await createBatch(1, type);
                const payload = {
                    actor: request.initiatorAccount,
                    realm: request.organization.realm,
                    input: {
                        organization: request.organization.id,
                        account: request.employee.account!,
                        process: request.id,
                    },
                };

                // Act
                await suite.transaction((transaction) =>
                    suite.repository().service.beginHire({ identifiers: [request.id], transaction }),
                );
                await suite.transaction(async (transaction) => {
                    const employee = await transaction.findOneOrFail(Employee, request.employee.id);
                    const position = await transaction.findOneOrFail(Position, request.payload.position);
                    const assignment = await transaction.findOneOrFail(PositionAssignment, {
                        sourceRequest: { id: request.id },
                    });

                    expect(employee.status).toBe(
                        type === HRRequestType.HIRE ? EmployeeStatus.DRAFT : EmployeeStatus.TERMINATED,
                    );
                    expect(employee.reservation).toBe(request.id);
                    expect(position.reservation).toBe(request.id);
                    expect(assignment.status).toBe(PositionAssignmentStatus.RESERVED);
                    expect(() => employee.unlinkAccount()).toThrow();
                    expect(() => employee.archive()).toThrow();
                    expect(() => position.archive()).toThrow();
                    expect(() => assignment.void()).toThrow();
                });
                await suite.transaction((transaction) =>
                    suite.repository().service.completeHire({ ...payload, realm: randomUUID(), transaction }),
                );
                await suite.transaction((transaction) =>
                    suite.repository().service.completeHire({ ...payload, transaction }),
                );
                await suite.transaction((transaction) =>
                    suite.repository().service.completeHire({ ...payload, transaction }),
                );
                await suite.transaction((transaction) =>
                    suite.repository().service.completeHire({
                        ...payload,
                        input: { ...payload.input, reason: "stale rejection" },
                        transaction,
                    }),
                );

                // Assert
                await suite.transaction(async (transaction) => {
                    const employee = await transaction.findOneOrFail(Employee, request.employee.id);
                    const position = await transaction.findOneOrFail(Position, request.payload.position);
                    const assignment = await transaction.findOneOrFail(PositionAssignment, {
                        sourceRequest: { id: request.id },
                    });
                    const applied = await transaction.findOneOrFail(HRRequest, request.id);
                    expect(employee).toMatchObject({
                        employmentStartedOn: "2026-02-01",
                        scheduleTimezone: "Europe/London",
                        status: EmployeeStatus.ACTIVE,
                        termsRevision: type === HRRequestType.REHIRE ? 3 : 1,
                    });
                    expect(employee.reservation).toBeFalsy();
                    expect(position.reservation).toBeFalsy();
                    expect(assignment.status).toBe(PositionAssignmentStatus.ACTIVE);
                    expect(applied.executionStatus).toBe(HRExecutionStatus.APPLIED);
                    expect(await transaction.count(PositionAssignment, { employee: { id: employee.id } })).toBe(1);
                });
            },
        );

        it("[case] - releases rejected reservations without changing previous employee terms", async () => {
            // Arrange
            const [request] = await createBatch(1, HRRequestType.REHIRE);
            const payload = {
                actor: request.initiatorAccount,
                realm: request.organization.realm,
                input: {
                    organization: request.organization.id,
                    account: request.employee.account!,
                    process: request.id,
                    reason: "membership blocked",
                },
            };

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.beginHire({ identifiers: [request.id], transaction }),
            );
            await suite.transaction((transaction) => suite.repository().service.completeHire({ ...payload, transaction }));
            await suite.transaction((transaction) => suite.repository().service.completeHire({ ...payload, transaction }));

            // Assert
            await suite.transaction(async (transaction) => {
                const employee = await transaction.findOneOrFail(Employee, request.employee.id);
                const position = await transaction.findOneOrFail(Position, request.payload.position);
                const assignment = await transaction.findOneOrFail(PositionAssignment, {
                    sourceRequest: { id: request.id },
                });
                const failed = await transaction.findOneOrFail(HRRequest, request.id);
                expect(employee).toMatchObject({
                    status: EmployeeStatus.TERMINATED,
                    employmentEndedOn: "2026-01-31",
                    termsRevision: 2,
                });
                expect(employee.reservation).toBeFalsy();
                expect(position.reservation).toBeFalsy();
                expect(assignment.status).toBe(PositionAssignmentStatus.VOIDED);
                expect(failed).toMatchObject({ executionStatus: HRExecutionStatus.FAILED, failure: "membership blocked" });
            });
        });

        it("[case] - applies an unlinked hire immediately and isolates a mismatched employee status", async () => {
            // Arrange
            const requests = await createBatch(2);
            await suite.transaction(async (transaction) => {
                const employee = await transaction.findOneOrFail(Employee, requests[0].employee.id);
                employee.unlinkAccount();
                const other = await transaction.findOneOrFail(Employee, requests[1].employee.id);
                other.archive();
            });

            // Act
            const result = await suite.transaction((transaction) =>
                suite.repository().service.beginHire({ identifiers: requests.map(({ id }) => id), transaction }),
            );

            // Assert
            expect(result.find(({ id }) => id === requests[0].id)?.executionStatus).toBe(HRExecutionStatus.APPLIED);
            expect(result.find(({ id }) => id === requests[1].id)?.executionStatus).toBe(HRExecutionStatus.FAILED);
            await suite.transaction(async (transaction) => {
                expect(await transaction.count(PositionAssignment, { status: PositionAssignmentStatus.ACTIVE })).toBe(1);
                expect(await transaction.count(PositionAssignment, { status: PositionAssignmentStatus.RESERVED })).toBe(0);
            });
        });

        it("[case] - reserves a shared position for only one concurrent hire", async () => {
            // Arrange
            const requests = await createBatch(2);
            await suite.transaction(async (transaction) => {
                const request = await transaction.findOneOrFail(HRRequest, requests[1].id);
                request.payload = { ...request.payload, position: requests[0].payload.position };
                request.targetPosition = transaction.getReference(Position, requests[0].payload.position);
            });

            // Act
            const outcomes = await Promise.all(
                requests.map((request) =>
                    suite.transaction((transaction) =>
                        suite.repository().service.beginHire({ identifiers: [request.id], transaction }),
                    ),
                ),
            );

            // Assert
            expect(
                outcomes.flat().filter(({ executionStatus }) => executionStatus === HRExecutionStatus.RUNNING),
            ).toHaveLength(1);
            expect(
                outcomes.flat().filter(({ executionStatus }) => executionStatus === HRExecutionStatus.FAILED),
            ).toHaveLength(1);
            await suite.transaction(async (transaction) => {
                expect(await transaction.count(PositionAssignment, { status: PositionAssignmentStatus.RESERVED })).toBe(1);
            });
        });

        it("[case] - rolls back reservations together with execution state", async () => {
            // Arrange
            const [request] = await createBatch(1);

            // Act
            const result = suite.transaction(async (transaction) => {
                await suite.repository().service.beginHire({ identifiers: [request.id], transaction });
                await transaction.flush();
                throw new Error("rollback hire");
            });

            // Assert
            await expect(result).rejects.toThrow("rollback hire");
            await suite.transaction(async (transaction) => {
                const employee = await transaction.findOneOrFail(Employee, request.employee.id);
                const position = await transaction.findOneOrFail(Position, request.payload.position);
                const pending = await transaction.findOneOrFail(HRRequest, request.id);
                expect(employee.reservation).toBeFalsy();
                expect(position.reservation).toBeFalsy();
                expect(pending.executionStatus).toBe(HRExecutionStatus.NOT_STARTED);
                expect(await transaction.count(PositionAssignment, { sourceRequest: { id: request.id } })).toBe(0);
            });
        });

        it("[case] - keeps business SQL count constant for 1, 2, 10 and 100 reserved hires", async () => {
            // Arrange
            async function measure(count: number): Promise<{ reads: number; writes: number }> {
                const requests = await createBatch(count);

                // Act
                return await suite.transaction(async (transaction) => {
                    const execute = jest.spyOn(transaction.getConnection(), "execute");
                    try {
                        const result = await suite.repository().service.beginHire({
                            identifiers: requests.map(({ id }) => id),
                            transaction,
                        });
                        await transaction.flush();
                        const queries = execute.mock.calls.map(([sql]) => String(sql).toLowerCase());
                        expect(result.every(({ executionStatus }) => executionStatus === HRExecutionStatus.RUNNING)).toBe(
                            true,
                        );
                        return {
                            reads: queries.filter((sql) => sql.startsWith("select")).length,
                            writes: queries.filter((sql) => /^(insert|update|delete)/.test(sql)).length,
                        };
                    } finally {
                        execute.mockRestore();
                    }
                });
            }

            const counts = [await measure(1), await measure(2), await measure(10), await measure(100)];

            // Assert
            expect(counts[0]).toEqual({ reads: 8, writes: 4 });
            expect(counts.slice(1)).toEqual(Array.from({ length: 3 }, () => ({ reads: 11, writes: 4 })));
        });
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

    describe("[Method] - transfer", () => {
        it("[case] - preserves assignment history with constant SQL count for 1, 2, 10 and 100 transfers", async () => {
            // Arrange
            const measure = async (size: number): Promise<{ reads: number; writes: number }> => {
                const organization = await suite.fixtures().createOrganization();
                const requests = await Promise.all(
                    Array.from({ length: size }, async () => {
                        const employee = await suite
                            .fixtures()
                            .createEmployee({ organization, status: EmployeeStatus.ACTIVE });
                        await suite.fixtures().createPositionAssignment({ employee, fte: "0.5000" });
                        const position = await suite.fixtures().createPosition({ organization, title: "New placement" });
                        return await suite.fixtures().createHRRequest({
                            payload: { position: position.id, validFrom: "2026-07-01" },
                            status: HRRequestStatus.APPROVED,
                            type: HRRequestType.TRANSFER,
                            targetPosition: position,
                            approvedRevision: 1,
                            organization,
                            employee,
                        });
                    }),
                );
                await suite.transaction(async (transaction) => {
                    const positions = await transaction.find(Position, { organization: organization.id });
                    positions.forEach((position) => position.completePlacement(false));
                });
                const identifiers = requests.map(({ id }) => id);

                // Act
                const queries = await suite.transaction(async (transaction) => {
                    const execute = jest.spyOn(transaction.getConnection(), "execute");
                    try {
                        await suite.repository().service.transfer({ identifiers, transaction });
                        await transaction.flush();
                        return execute.mock.calls.map(([query]) => String(query));
                    } finally {
                        execute.mockRestore();
                    }
                });
                const repeated = await suite.transaction((transaction) =>
                    suite.repository().service.transfer({ identifiers, transaction }),
                );
                const assignments = await suite.transaction((transaction) =>
                    transaction.find(PositionAssignment, { organization: organization.id }),
                );
                const applied = await suite.transaction((transaction) =>
                    transaction.find(HRRequest, { id: { $in: identifiers } }),
                );

                // Assert
                expect(repeated).toEqual([]);
                expect(assignments).toHaveLength(size * 2);
                for (const request of requests) {
                    const current = assignments.find((assignment) => assignment.sourceRequest?.id === request.id)!;
                    const previous = assignments.find((assignment) => assignment.closedByRequest?.id === request.id)!;
                    expect(previous).toMatchObject({ status: PositionAssignmentStatus.CLOSED, validTo: "2026-07-01" });
                    expect(current).toMatchObject({
                        position: { id: request.targetPosition!.id },
                        employee: { id: request.employee.id },
                        status: PositionAssignmentStatus.ACTIVE,
                        placementSnapshot: { title: "New placement" },
                        positionTitle: "New placement",
                        salaryCurrency: previous.salaryCurrency,
                        salaryAmount: previous.salaryAmount,
                        salaryPeriod: previous.salaryPeriod,
                        validFrom: "2026-07-01",
                        fte: previous.fte,
                    });
                    expect(applied.find(({ id }) => id === request.id)).toMatchObject({
                        result: {
                            assignment: current.id,
                            employee: request.employee.id,
                            position: request.targetPosition!.id,
                        },
                        executionStatus: HRExecutionStatus.APPLIED,
                        appliedRevision: 1,
                    });
                }
                return {
                    reads: queries.filter((query) => /^select /i.test(query)).length,
                    writes: queries.filter((query) => /^(insert|update|delete) /i.test(query)).length,
                };
            };
            const counts = [await measure(1), await measure(2), await measure(10), await measure(100)];

            // Assert
            expect(counts[0].writes).toBe(3);
            expect(counts[1].reads).toBeLessThanOrEqual(counts[0].reads + 2);
            expect(counts[1].writes).toBe(counts[0].writes);
            expect(counts[2]).toEqual(counts[1]);
            expect(counts[3]).toEqual(counts[1]);
        });

        it("[case] - isolates invalid transfers without closing their existing assignments", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const kinds = [
                "valid",
                "unassigned",
                "missing",
                "foreign",
                "archived",
                "pending",
                "inactive",
                "period",
                "occupied",
                "mismatch",
                "future",
                "draft",
            ];
            const requests = await Promise.all(
                kinds.map(async (kind) => {
                    const employee = await suite.fixtures().createEmployee({
                        status: kind === "inactive" ? EmployeeStatus.TERMINATED : EmployeeStatus.ACTIVE,
                        organization,
                    });
                    if (kind !== "unassigned") {
                        await suite.fixtures().createPositionAssignment({ employee });
                    }
                    const position = await suite.fixtures().createPosition({
                        organization: kind === "foreign" ? undefined : organization,
                        status: kind === "archived" ? RecordStatus.ARCHIVED : RecordStatus.ACTIVE,
                    });
                    if (kind !== "pending") {
                        await suite.transaction(async (transaction) => {
                            (await transaction.findOneOrFail(Position, { id: position.id })).completePlacement(false);
                        });
                    }
                    if (kind === "occupied") {
                        await suite.fixtures().createPositionAssignment({ organization, position });
                    }
                    const mismatch =
                        kind === "mismatch" ? await suite.fixtures().createPosition({ organization }) : undefined;
                    return await suite.fixtures().createHRRequest({
                        payload: {
                            position: kind === "missing" ? randomUUID() : position.id,
                            validFrom: kind === "period" ? "2025-12-31" : "2026-07-01",
                        },
                        effectiveAt: kind === "future" ? new Date("2999-01-01T00:00:00Z") : undefined,
                        status: kind === "draft" ? HRRequestStatus.DRAFT : HRRequestStatus.APPROVED,
                        targetPosition: mismatch,
                        type: HRRequestType.TRANSFER,
                        approvedRevision: 1,
                        organization,
                        employee,
                    });
                }),
            );

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.transfer({
                    identifiers: requests.map(({ id }) => id),
                    transaction,
                }),
            );
            const persisted = await suite.transaction((transaction) =>
                transaction.find(HRRequest, { organization: organization.id }),
            );
            const assignments = await suite.transaction((transaction) =>
                transaction.find(PositionAssignment, { organization: organization.id }),
            );

            // Assert
            for (const [index, kind] of kinds.entries()) {
                const request = requests[index];
                expect(persisted.find(({ id }) => id === request.id)?.executionStatus).toBe(
                    kind === "valid"
                        ? HRExecutionStatus.APPLIED
                        : ["future", "draft"].includes(kind)
                          ? HRExecutionStatus.NOT_STARTED
                          : HRExecutionStatus.FAILED,
                );
                const history = assignments.filter(({ employee }) => employee.id === request.employee.id);
                expect(history).toHaveLength(kind === "valid" ? 2 : kind === "unassigned" ? 0 : 1);
                if (kind !== "valid" && kind !== "unassigned") {
                    expect(history[0].status).toBe(PositionAssignmentStatus.ACTIVE);
                    expect(history[0].validTo).toBeFalsy();
                }
            }
        });

        it("[case] - applies sequential transfers of one employee within the same batch", async () => {
            // Arrange
            const employee = await suite.fixtures().createEmployee({ status: EmployeeStatus.ACTIVE });
            const organization = employee.organization;
            const previous = await suite.fixtures().createPositionAssignment({ employee });
            const requests = await Promise.all(
                ["02", "03"].map(async (month) => {
                    const position = await suite.fixtures().createPosition({ organization });
                    await suite.transaction(async (transaction) => {
                        (await transaction.findOneOrFail(Position, { id: position.id })).completePlacement(false);
                    });
                    return await suite.fixtures().createHRRequest({
                        payload: { position: position.id, validFrom: `2026-${month}-01` },
                        effectiveAt: new Date(`2026-${month}-01T00:00:00Z`),
                        status: HRRequestStatus.APPROVED,
                        type: HRRequestType.TRANSFER,
                        approvedRevision: 1,
                        organization,
                        employee,
                    });
                }),
            );

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.transfer({
                    identifiers: requests.map(({ id }) => id),
                    transaction,
                }),
            );
            const assignments = await suite.transaction((transaction) =>
                transaction.find(PositionAssignment, { employee: { id: employee.id } }, { orderBy: { validFrom: "ASC" } }),
            );

            // Assert
            expect(assignments).toHaveLength(3);
            expect(assignments[0]).toMatchObject({
                id: previous.id,
                validTo: "2026-02-01",
                status: PositionAssignmentStatus.CLOSED,
            });
            expect(assignments[1]).toMatchObject({
                validFrom: "2026-02-01",
                validTo: "2026-03-01",
                status: PositionAssignmentStatus.CLOSED,
                sourceRequest: { id: requests[0].id },
                closedByRequest: { id: requests[1].id },
            });
            expect(assignments[2]).toMatchObject({
                validFrom: "2026-03-01",
                status: PositionAssignmentStatus.ACTIVE,
                sourceRequest: { id: requests[1].id },
            });
        });

        it.each([true, false])(
            "[case] - reserves a shared target position (concurrent transactions: %s)",
            async (concurrent) => {
                // Arrange
                const organization = await suite.fixtures().createOrganization();
                const position = await suite.fixtures().createPosition({ organization });
                await suite.transaction(async (transaction) => {
                    (await transaction.findOneOrFail(Position, { id: position.id })).completePlacement(false);
                });
                const requests = await Promise.all(
                    Array.from({ length: 2 }, async () => {
                        const employee = await suite
                            .fixtures()
                            .createEmployee({ organization, status: EmployeeStatus.ACTIVE });
                        await suite.fixtures().createPositionAssignment({ employee });
                        return await suite.fixtures().createHRRequest({
                            payload: { position: position.id, validFrom: "2026-07-01" },
                            status: HRRequestStatus.APPROVED,
                            type: HRRequestType.TRANSFER,
                            approvedRevision: 1,
                            organization,
                            employee,
                        });
                    }),
                );

                // Act
                if (concurrent) {
                    await Promise.all(
                        requests.map(({ id }) =>
                            suite.transaction((transaction) =>
                                suite.repository().service.transfer({ identifiers: [id], transaction }),
                            ),
                        ),
                    );
                } else {
                    await suite.transaction((transaction) =>
                        suite.repository().service.transfer({ identifiers: requests.map(({ id }) => id), transaction }),
                    );
                }
                const persisted = await suite.transaction((transaction) =>
                    transaction.find(HRRequest, { organization: organization.id }),
                );

                // Assert
                expect(
                    persisted.filter(({ executionStatus }) => executionStatus === HRExecutionStatus.APPLIED),
                ).toHaveLength(1);
                expect(
                    persisted.filter(({ executionStatus }) => executionStatus === HRExecutionStatus.FAILED),
                ).toHaveLength(1);
                expect(
                    await suite.transaction((transaction) =>
                        transaction.count(PositionAssignment, {
                            position: { id: position.id },
                            status: PositionAssignmentStatus.ACTIVE,
                        }),
                    ),
                ).toBe(1);
            },
        );

        it("[case] - rolls back flushed closures and execution states if the transaction fails", async () => {
            // Arrange
            const employee = await suite.fixtures().createEmployee({ status: EmployeeStatus.ACTIVE });
            const organization = employee.organization;
            const previous = await suite.fixtures().createPositionAssignment({ employee });
            const position = await suite.fixtures().createPosition({ organization });
            await suite.transaction(async (transaction) => {
                (await transaction.findOneOrFail(Position, { id: position.id })).completePlacement(false);
            });
            const request = await suite.fixtures().createHRRequest({
                payload: { position: position.id, validFrom: "2026-07-01" },
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.TRANSFER,
                approvedRevision: 1,
                organization,
                employee,
            });

            // Act
            const result = suite.transaction(async (transaction) => {
                await suite.repository().service.transfer({ identifiers: [request.id], transaction });
                await transaction.flush();
                throw new Error("rollback");
            });

            // Assert
            await expect(result).rejects.toThrow("rollback");
            expect(
                await suite.transaction((transaction) =>
                    transaction.findOneOrFail(PositionAssignment, { id: previous.id }),
                ),
            ).toMatchObject({ status: PositionAssignmentStatus.ACTIVE, validTo: null });
            expect(
                await suite.transaction((transaction) =>
                    transaction.count(PositionAssignment, { employee: { id: employee.id } }),
                ),
            ).toBe(1);
            expect(
                await suite.transaction((transaction) => transaction.findOneOrFail(HRRequest, { id: request.id })),
            ).toMatchObject({ executionStatus: HRExecutionStatus.NOT_STARTED });
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
