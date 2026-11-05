import { describe, expect, it, jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { HRRequestExecutionIntegrationHelpers } from "~testing/integration/domain-service/hr-request-execution.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import {
    PositionAssignmentStatus,
    HRExecutionStatus,
    HRRequestStatus,
    EmployeeStatus,
    HRRequestType,
    LeaveLedgerKind,
    AbsenceStatus,
    RecordStatus,
    LeaveUnit,
    PayPeriod,
} from "~context/enums";
import {
    PositionAssignment,
    LeaveLedgerEntry,
    Employment,
    HRRequest,
    Employee,
    Position,
    Absence,
} from "~context/domain/entities";

const helpers = new HRRequestExecutionIntegrationHelpers();

describe("[DomainService] - HRRequestExecution", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - cancelRequests", () => {
        async function createBatch(count: number): Promise<HRRequest<HRRequestType.CANCEL_REQUEST>[]> {
            const organization = await suite.fixtures().createOrganization();
            const employee = await suite.fixtures().createEmployee({
                scheduleTimezone: "Europe/London",
                status: EmployeeStatus.ACTIVE,
                organization,
            });
            return await suite.transaction(async (transaction) => {
                const requests = Array.from({ length: count }, () => {
                    const target = new HRRequest({
                        payload: { date: "2030-07-01", startTime: "18:00", endTime: "20:00" },
                        executionStatus: HRExecutionStatus.NOT_STARTED,
                        effectiveAt: new Date("2030-07-01T20:00:00Z"),
                        status: HRRequestStatus.APPROVED,
                        initiatorAccount: randomUUID(),
                        idempotencyKey: randomUUID(),
                        type: HRRequestType.OVERTIME,
                        payloadSchemaVersion: 1,
                        approvedRevision: 1,
                        revision: 1,
                        organization,
                        employee,
                    });
                    const request = new HRRequest({
                        executionStatus: HRExecutionStatus.NOT_STARTED,
                        payload: { reason: "Plans changed" },
                        status: HRRequestStatus.APPROVED,
                        type: HRRequestType.CANCEL_REQUEST,
                        initiatorAccount: randomUUID(),
                        idempotencyKey: randomUUID(),
                        payloadSchemaVersion: 1,
                        approvedRevision: 1,
                        relatedRequest: target,
                        revision: 1,
                        organization,
                        employee,
                    });
                    transaction.persist([target, request]);
                    return request;
                });
                await transaction.flush();
                return requests;
            });
        }

        it("[case] - cancels pending and scheduled originals once without creating side effects", async () => {
            // Arrange
            const requests = await createBatch(2);
            await suite.transaction(async (transaction) => {
                const target = await transaction.findOneOrFail(HRRequest, { id: requests[1].relatedRequest!.id });
                target.executionStatus = HRExecutionStatus.SCHEDULED;
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.cancelRequests({
                    identifiers: requests.map(({ id }) => id),
                    transaction,
                }),
            );
            const repeated = await suite.transaction((transaction) =>
                suite.repository().service.cancelRequests({
                    identifiers: requests.map(({ id }) => id),
                    transaction,
                }),
            );

            // Assert
            expect(repeated).toEqual([]);
            await suite.transaction(async (transaction) => {
                const targets = await transaction.find(HRRequest, {
                    id: { $in: requests.map(({ relatedRequest }) => relatedRequest!.id) },
                });
                const cancellations = await transaction.find(HRRequest, { id: { $in: requests.map(({ id }) => id) } });
                expect(targets.every(({ status }) => status === HRRequestStatus.CANCELLED)).toBe(true);
                expect(targets.map(({ executionStatus }) => executionStatus).sort()).toEqual(
                    [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED].sort(),
                );
                expect(cancellations.every(({ executionStatus }) => executionStatus === HRExecutionStatus.APPLIED)).toBe(
                    true,
                );
                expect(cancellations.map(({ result }) => result!.cancelledRequest).sort()).toEqual(
                    targets.map(({ id }) => id).sort(),
                );
                expect(await transaction.count(LeaveLedgerEntry, {})).toBe(0);
                expect(await transaction.count(Absence, {})).toBe(0);
            });
        });

        it("[case] - isolates running, applied and failed originals without changing their results", async () => {
            // Arrange
            const requests = await createBatch(4);
            const states = [HRExecutionStatus.RUNNING, HRExecutionStatus.APPLIED, HRExecutionStatus.FAILED];
            await suite.transaction(async (transaction) => {
                const targets = await transaction.find(HRRequest, {
                    id: { $in: requests.map(({ relatedRequest }) => relatedRequest!.id) },
                });
                for (const [index, request] of requests.entries()) {
                    const target = targets.find(({ id }) => id === request.relatedRequest!.id)!;
                    if (index < states.length) {
                        target.executionStatus = states[index];
                        target.result = { existingEffect: "preserved" };
                        target.appliedRevision = states[index] === HRExecutionStatus.APPLIED ? 1 : undefined;
                    }
                }
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.cancelRequests({
                    identifiers: requests.map(({ id }) => id),
                    transaction,
                }),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const targets = await transaction.find(HRRequest, {
                    id: { $in: requests.map(({ relatedRequest }) => relatedRequest!.id) },
                });
                const cancellations = await transaction.find(HRRequest, { id: { $in: requests.map(({ id }) => id) } });
                for (const [index, state] of states.entries()) {
                    const target = targets.find(({ id }) => id === requests[index].relatedRequest!.id)!;
                    expect(target.executionStatus).toBe(state);
                    expect(target.status).toBe(HRRequestStatus.APPROVED);
                    expect(target.result).toEqual({ existingEffect: "preserved" });
                    expect(cancellations.find(({ id }) => id === requests[index].id)!.failure).toContain(
                        "INVALID_EXECUTION_STATUS",
                    );
                }
                expect(cancellations.find(({ id }) => id === requests[3].id)!.executionStatus).toBe(
                    HRExecutionStatus.APPLIED,
                );
            });
        });

        it("[case] - serializes concurrent cancellations of the same original", async () => {
            // Arrange
            const [first] = await createBatch(1);
            const second = await suite.fixtures().createHRRequest({
                payload: { reason: "Duplicate cancellation" },
                relatedRequest: first.relatedRequest,
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.CANCEL_REQUEST,
                organization: first.organization,
                employee: first.employee,
                approvedRevision: 1,
            });

            // Act
            await Promise.all(
                [first, second].map((request) =>
                    suite.transaction((transaction) =>
                        suite.repository().service.cancelRequests({ identifiers: [request.id], transaction }),
                    ),
                ),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const cancellations = await transaction.find(HRRequest, { id: { $in: [first.id, second.id] } });
                expect(
                    cancellations.filter(({ executionStatus }) => executionStatus === HRExecutionStatus.APPLIED),
                ).toHaveLength(1);
                expect(
                    cancellations.find(({ executionStatus }) => executionStatus === HRExecutionStatus.FAILED)!.failure,
                ).toContain("INVALID_STATUS");
                expect((await transaction.findOneOrFail(HRRequest, { id: first.relatedRequest!.id })).status).toBe(
                    HRRequestStatus.CANCELLED,
                );
            });
        });

        it("[case] - races execution without cancelling an applied balance adjustment", async () => {
            // Arrange
            const [request] = await createBatch(1);
            const policy = await suite.fixtures().createLeavePolicy({ organization: request.organization });
            await suite.transaction(async (transaction) => {
                const target = await transaction.findOneOrFail(HRRequest, { id: request.relatedRequest!.id });
                target.type = HRRequestType.LEAVE_ADJUSTMENT;
                target.effectiveAt = undefined;
                target.payload = {
                    effectiveOn: "2020-01-01",
                    balanceDelta: "2",
                    leavePolicy: policy.id,
                    reason: "Adjustment",
                    poolCode: "ANNUAL",
                    unit: LeaveUnit.DAY,
                };
            });

            // Act
            await Promise.all([
                suite.transaction((transaction) =>
                    suite.repository().service.cancelRequests({ identifiers: [request.id], transaction }),
                ),
                suite.transaction((transaction) =>
                    suite.repository().service.adjustLeave({ identifiers: [request.relatedRequest!.id], transaction }),
                ),
            ]);

            // Assert
            await suite.transaction(async (transaction) => {
                const target = await transaction.findOneOrFail(HRRequest, { id: request.relatedRequest!.id });
                const cancellation = await transaction.findOneOrFail(HRRequest, { id: request.id });
                const count = await transaction.count(LeaveLedgerEntry, { sourceRequest: { id: target.id } });
                if (target.status === HRRequestStatus.CANCELLED) {
                    expect(target.executionStatus).toBe(HRExecutionStatus.NOT_STARTED);
                    expect(cancellation.executionStatus).toBe(HRExecutionStatus.APPLIED);
                    expect(count).toBe(0);
                } else {
                    expect(target.executionStatus).toBe(HRExecutionStatus.APPLIED);
                    expect(cancellation.executionStatus).toBe(HRExecutionStatus.FAILED);
                    expect(count).toBe(1);
                }
            });
        });

        it("[case] - skips future and unapproved cancellations", async () => {
            // Arrange
            const requests = await createBatch(2);
            await suite.transaction(async (transaction) => {
                const first = await transaction.findOneOrFail(HRRequest, { id: requests[0].id });
                const second = await transaction.findOneOrFail(HRRequest, { id: requests[1].id });
                first.effectiveAt = new Date("2030-07-01T00:00:00Z");
                second.status = HRRequestStatus.DRAFT;
            });

            // Act
            const result = await suite.transaction((transaction) =>
                suite.repository().service.cancelRequests({
                    identifiers: requests.map(({ id }) => id),
                    transaction,
                }),
            );

            // Assert
            expect(result).toEqual([]);
            await suite.transaction(async (transaction) => {
                const targets = await transaction.find(HRRequest, {
                    id: { $in: requests.map(({ relatedRequest }) => relatedRequest!.id) },
                });
                expect(targets.every(({ status }) => status === HRRequestStatus.APPROVED)).toBe(true);
            });
        });

        it("[case] - rolls back both the cancellation and the original status", async () => {
            // Arrange
            const [request] = await createBatch(1);

            // Act
            await expect(
                suite.transaction(async (transaction) => {
                    await suite.repository().service.cancelRequests({ identifiers: [request.id], transaction });
                    await transaction.flush();
                    throw new Error("rollback cancellation");
                }),
            ).rejects.toThrow("rollback cancellation");

            // Assert
            await suite.transaction(async (transaction) => {
                expect((await transaction.findOneOrFail(HRRequest, { id: request.relatedRequest!.id })).status).toBe(
                    HRRequestStatus.APPROVED,
                );
                expect((await transaction.findOneOrFail(HRRequest, { id: request.id })).executionStatus).toBe(
                    HRExecutionStatus.NOT_STARTED,
                );
            });
        });

        it("[case] - keeps SQL bounded for 1, 2, 10 and 100 cancellations", async () => {
            const counts: { reads: number; writes: number }[] = [];
            async function measure(count: number): Promise<void> {
                const requests = await createBatch(count);
                await suite.transaction(async (transaction) => {
                    const execute = jest.spyOn(transaction.getConnection(), "execute");
                    try {
                        await suite
                            .repository()
                            .service.cancelRequests({ identifiers: requests.map(({ id }) => id), transaction });
                        await transaction.flush();
                        const queries = execute.mock.calls.map(([sql]) => String(sql).toLowerCase());
                        counts.push({
                            reads: queries.filter((sql) => sql.startsWith("select")).length,
                            writes: queries.filter((sql) => /^(insert|update|delete)/.test(sql)).length,
                        });
                        expect(
                            await transaction.count(HRRequest, {
                                status: HRRequestStatus.CANCELLED,
                                id: { $in: requests.map(({ relatedRequest }) => relatedRequest!.id) },
                            }),
                        ).toBe(count);
                    } finally {
                        execute.mockRestore();
                    }
                });
            }
            await measure(1);
            await measure(2);
            await measure(10);
            await measure(100);
            expect(counts[0].reads).toBeLessThanOrEqual(4);
            expect(counts[0].writes).toBeLessThanOrEqual(2);
            expect(counts[1].reads).toBeLessThanOrEqual(4);
            expect(counts[1].writes).toBeLessThanOrEqual(2);
            expect(counts.slice(1)).toEqual([counts[1], counts[1], counts[1]]);
        });
    });

    describe("[Method] - recordOvertime", () => {
        async function createBatch(count: number): Promise<HRRequest<HRRequestType.OVERTIME>[]> {
            const organization = await suite.fixtures().createOrganization();
            return await suite.transaction(async (transaction) => {
                const requests = Array.from({ length: count }, () => {
                    const employee = new Employee({
                        scheduleTimezone: "Europe/London",
                        employmentStartedOn: "2020-01-01",
                        status: EmployeeStatus.ACTIVE,
                        termsValidFrom: "2020-01-01",
                        employeeNumber: randomUUID(),
                        firstName: "Overtime",
                        lastName: "Employee",
                        termsRevision: 1,
                        organization,
                    });
                    const position = new Position({
                        status: RecordStatus.ACTIVE,
                        department: randomUUID(),
                        plannedFte: "1",
                        code: randomUUID(),
                        title: "Engineer",
                        team: randomUUID(),
                        organization,
                    });
                    const assignment = new PositionAssignment({
                        status: PositionAssignmentStatus.ACTIVE,
                        department: position.department,
                        positionTitle: position.title,
                        salaryPeriod: PayPeriod.MONTH,
                        salaryCurrency: "GBP",
                        validFrom: "2020-01-01",
                        placementSnapshot: {},
                        salaryAmount: "2600",
                        organization,
                        employee,
                        position,
                        fte: "1",
                    });
                    const request = new HRRequest({
                        payload: { date: "2020-07-01", startTime: "18:00", endTime: "20:30" },
                        executionStatus: HRExecutionStatus.NOT_STARTED,
                        status: HRRequestStatus.APPROVED,
                        initiatorAccount: randomUUID(),
                        idempotencyKey: randomUUID(),
                        type: HRRequestType.OVERTIME,
                        payloadSchemaVersion: 1,
                        approvedRevision: 1,
                        revision: 1,
                        organization,
                        employee,
                    });
                    transaction.persist([employee, position, assignment, request]);
                    return request;
                });
                await transaction.flush();
                return requests;
            });
        }

        it("[case] - records the fact and estimate once without changing leave balances", async () => {
            // Arrange
            const [request] = await createBatch(1);

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.recordOvertime({ identifiers: [request.id], transaction }),
            );
            const repeated = await suite.transaction((transaction) =>
                suite.repository().service.recordOvertime({ identifiers: [request.id], transaction }),
            );

            // Assert
            expect(repeated).toEqual([]);
            await suite.transaction(async (transaction) => {
                const entity = await transaction.findOneOrFail(HRRequest, { id: request.id });
                expect(entity.executionStatus).toBe(HRExecutionStatus.APPLIED);
                expect(entity.result).toMatchObject({
                    estimatedAmount: "75.00",
                    minutes: 150,
                    hours: "2.500000",
                    currency: "GBP",
                });
                expect(await transaction.count(LeaveLedgerEntry, { employee: { id: request.employee.id } })).toBe(0);
                expect(await transaction.count(Absence, { employee: { id: request.employee.id } })).toBe(0);
            });
        });

        it("[case] - isolates duplicate dates and missing assignments from valid requests", async () => {
            // Arrange
            const [first, missing, valid] = await createBatch(3);
            const duplicate = await suite.fixtures().createHRRequest({
                payload: first.payload,
                employee: first.employee,
                organization: first.organization,
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.OVERTIME,
                approvedRevision: 1,
            });
            await suite.transaction(async (transaction) => {
                const assignment = await transaction.findOneOrFail(PositionAssignment, {
                    employee: { id: missing.employee.id },
                });
                assignment.status = PositionAssignmentStatus.VOIDED;
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.recordOvertime({
                    identifiers: [first.id, duplicate.id, missing.id, valid.id],
                    transaction,
                }),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const entries = await transaction.find(HRRequest, { id: { $in: [first.id, duplicate.id] } });
                expect(entries.filter(({ executionStatus }) => executionStatus === HRExecutionStatus.APPLIED)).toHaveLength(
                    1,
                );
                expect(
                    entries.find(({ executionStatus }) => executionStatus === HRExecutionStatus.FAILED)!.failure,
                ).toContain("OVERTIME_ALREADY_RECORDED");
                expect((await transaction.findOneOrFail(HRRequest, { id: missing.id })).failure).toContain(
                    "PLACEMENT_NOT_FOUND",
                );
                expect((await transaction.findOneOrFail(HRRequest, { id: valid.id })).executionStatus).toBe(
                    HRExecutionStatus.APPLIED,
                );
            });
        });

        it("[case] - serializes concurrent requests for one employee and date", async () => {
            // Arrange
            const [first] = await createBatch(1);
            const second = await suite.fixtures().createHRRequest({
                payload: first.payload,
                employee: first.employee,
                organization: first.organization,
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.OVERTIME,
                approvedRevision: 1,
            });

            // Act
            await Promise.all(
                [first, second].map((request) =>
                    suite.transaction((transaction) =>
                        suite.repository().service.recordOvertime({ identifiers: [request.id], transaction }),
                    ),
                ),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const entries = await transaction.find(HRRequest, { id: { $in: [first.id, second.id] } });
                expect(entries.filter(({ executionStatus }) => executionStatus === HRExecutionStatus.APPLIED)).toHaveLength(
                    1,
                );
                expect(
                    entries.find(({ executionStatus }) => executionStatus === HRExecutionStatus.FAILED)!.failure,
                ).toContain("OVERTIME_ALREADY_RECORDED");
            });
        });

        it("[case] - waits for the local end time and skips unapproved and future-effective requests", async () => {
            // Arrange
            const [pending, scheduled, draft, future] = await createBatch(4);
            await suite.transaction(async (transaction) => {
                const requests = await transaction.find(HRRequest, { id: { $in: [pending.id, scheduled.id] } });
                for (const request of requests) {
                    request.payload = { date: "2030-07-01", startTime: "18:00", endTime: "20:00" };
                }
                const request = await transaction.findOneOrFail(HRRequest, { id: scheduled.id });
                request.executionStatus = HRExecutionStatus.SCHEDULED;
                request.effectiveAt = new Date(0);
                (await transaction.findOneOrFail(HRRequest, { id: draft.id })).status = HRRequestStatus.DRAFT;
                (await transaction.findOneOrFail(HRRequest, { id: future.id })).effectiveAt = new Date(
                    "2030-07-01T00:00:00Z",
                );
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.recordOvertime({
                    identifiers: [pending.id, scheduled.id, draft.id, future.id],
                    transaction,
                }),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const requests = await transaction.find(HRRequest, { id: { $in: [pending.id, scheduled.id] } });
                for (const request of requests) {
                    expect(request.executionStatus).toBe(HRExecutionStatus.SCHEDULED);
                    expect(request.effectiveAt!.toISOString()).toBe("2030-07-01T19:00:00.000Z");
                    expect(request.result).toBeNull();
                }
                const skipped = await transaction.find(HRRequest, { id: { $in: [draft.id, future.id] } });
                expect(skipped.map(({ executionStatus }) => executionStatus)).toEqual([
                    HRExecutionStatus.NOT_STARTED,
                    HRExecutionStatus.NOT_STARTED,
                ]);
            });
        });

        it("[case] - rolls back the recorded fact and estimate with the transaction", async () => {
            // Arrange
            const [request] = await createBatch(1);

            // Act
            await expect(
                suite.transaction(async (transaction) => {
                    await suite.repository().service.recordOvertime({ identifiers: [request.id], transaction });
                    await transaction.flush();
                    throw new Error("rollback overtime");
                }),
            ).rejects.toThrow("rollback overtime");

            // Assert
            await suite.transaction(async (transaction) => {
                const entity = await transaction.findOneOrFail(HRRequest, { id: request.id });
                expect(entity.executionStatus).toBe(HRExecutionStatus.NOT_STARTED);
                expect(entity.result).toBeNull();
            });
        });

        it("[case] - keeps SQL bounded for 1, 2, 10 and 100 requests", async () => {
            const counts: { reads: number; writes: number }[] = [];
            async function measure(count: number): Promise<void> {
                const requests = await createBatch(count);
                await suite.transaction(async (transaction) => {
                    const execute = jest.spyOn(transaction.getConnection(), "execute");
                    try {
                        await suite
                            .repository()
                            .service.recordOvertime({ identifiers: requests.map(({ id }) => id), transaction });
                        await transaction.flush();
                        const queries = execute.mock.calls.map(([sql]) => String(sql).toLowerCase());
                        counts.push({
                            reads: queries.filter((sql) => sql.startsWith("select")).length,
                            writes: queries.filter((sql) => /^(insert|update|delete)/.test(sql)).length,
                        });
                        expect(
                            await transaction.count(HRRequest, {
                                executionStatus: HRExecutionStatus.APPLIED,
                                id: { $in: requests.map(({ id }) => id) },
                            }),
                        ).toBe(count);
                    } finally {
                        execute.mockRestore();
                    }
                });
            }
            await measure(1);
            await measure(2);
            await measure(10);
            await measure(100);
            expect(counts[0].reads).toBeLessThanOrEqual(7);
            expect(counts[0].writes).toBe(1);
            expect(counts[1].reads).toBeLessThanOrEqual(7);
            expect(counts[1].writes).toBe(1);
            expect(counts.slice(1)).toEqual([counts[1], counts[1], counts[1]]);
        });
    });

    describe("[Behavior] - absence execution", () => {
        async function createBatch(count: number, sharedEmployee = false): Promise<HRRequest<HRRequestType.ABSENCE>[]> {
            const organization = await suite.fixtures().createOrganization();
            const workCalendar = await suite.fixtures().createWorkCalendar({ organization, verifiedThrough: "2031-12-31" });
            const workSchedule = await suite.fixtures().createWorkSchedule({ organization });
            const leavePolicy = await suite.fixtures().createLeavePolicy({ organization });
            return await suite.transaction(async (transaction) => {
                let shared: Employee | undefined;
                const requests = Array.from({ length: count }, () => {
                    const employee =
                        shared ??
                        new Employee({
                            scheduleTimezone: "Europe/London",
                            employmentStartedOn: "2026-01-01",
                            scheduleAnchorDate: "2026-01-01",
                            status: EmployeeStatus.ACTIVE,
                            termsValidFrom: "2026-01-01",
                            employeeNumber: randomUUID(),
                            firstName: "Absence",
                            lastName: "Employee",
                            termsRevision: 1,
                            workCalendar,
                            workSchedule,
                            organization,
                            leavePolicy,
                        });
                    const request = new HRRequest({
                        executionStatus: HRExecutionStatus.NOT_STARTED,
                        payloadSchemaVersion: 1,
                        initiatorAccount: randomUUID(),
                        idempotencyKey: randomUUID(),
                        status: HRRequestStatus.APPROVED,
                        type: HRRequestType.ABSENCE,
                        approvedRevision: 1,
                        revision: 1,
                        organization,
                        employee,
                        payload: {
                            startDate: "2030-06-01",
                            endDate: "2030-06-04",
                            poolCode: "ANNUAL",
                            unit: LeaveUnit.DAY,
                        },
                    });
                    transaction.persist(request);
                    if (!shared) {
                        transaction.persist([
                            employee,
                            new LeaveLedgerEntry({
                                calculationSnapshot: {},
                                idempotencyKey: randomUUID(),
                                kind: LeaveLedgerKind.ADJUSTMENT,
                                reason: "Opening balance",
                                effectiveOn: "2026-01-01",
                                unit: LeaveUnit.DAY,
                                balanceDelta: "10",
                                reservedDelta: "0",
                                poolCode: "ANNUAL",
                                organization,
                                leavePolicy,
                                employee,
                            }),
                        ]);
                    }
                    if (sharedEmployee) {
                        shared = employee;
                    }
                    return request;
                });
                await transaction.flush();
                return requests;
            });
        }

        it("[case] - reserves once, consumes at the local start and completes without double charging", async () => {
            // Arrange
            const [request] = await createBatch(1);
            const identifiers = [request.id];

            // Act
            await suite.transaction((transaction) => suite.repository().service.beginAbsence({ identifiers, transaction }));
            await suite.transaction((transaction) => suite.repository().service.beginAbsence({ identifiers, transaction }));
            const absence = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Absence, { sourceRequest: { id: request.id } }),
            );
            const advance = async (at: string): Promise<void> => {
                await suite.transaction((transaction) =>
                    suite.repository().service.advanceAbsences({
                        identifiers: [absence.id],
                        transaction,
                        at: new Date(at),
                    }),
                );
            };
            await advance("2030-05-31T22:59:00Z");
            await suite.transaction(async (transaction) => {
                const entries = await transaction.find(LeaveLedgerEntry, { sourceRequest: { id: request.id } });
                expect(entries).toHaveLength(1);
                expect(entries[0]).toMatchObject({
                    kind: LeaveLedgerKind.RESERVE,
                    reservedDelta: "3.000000",
                    balanceDelta: "0.000000",
                });
            });
            await advance("2030-05-31T23:00:00Z");
            await advance("2030-05-31T23:00:00Z");
            await advance("2030-06-03T23:00:00Z");

            // Assert
            await suite.transaction(async (transaction) => {
                const persisted = await transaction.findOneOrFail(Absence, { id: absence.id });
                const entries = await transaction.find(LeaveLedgerEntry, { sourceRequest: { id: request.id } });
                expect(persisted.status).toBe(AbsenceStatus.COMPLETED);
                expect(persisted.quantity).toBe("3.000000");
                expect(entries).toHaveLength(3);
                expect(entries.reduce((sum, entry) => sum + Number(entry.reservedDelta), 0)).toBe(0);
                expect(entries.reduce((sum, entry) => sum + Number(entry.balanceDelta), 0)).toBe(-3);
                expect((await transaction.findOneOrFail(HRRequest, { id: request.id })).executionStatus).toBe(
                    HRExecutionStatus.APPLIED,
                );
            });
        });

        it("[case] - isolates overlaps and insufficient balance within a batch", async () => {
            // Arrange
            const requests = await createBatch(3, true);
            await suite.transaction(async (transaction) => {
                const second = await transaction.findOneOrFail(HRRequest, { id: requests[1].id });
                const third = await transaction.findOneOrFail(HRRequest, { id: requests[2].id });
                second.createdAt = new Date(requests[0].createdAt.getTime() + 1000);
                third.payload = { startDate: "2030-07-01", endDate: "2030-08-01", poolCode: "ANNUAL", unit: LeaveUnit.DAY };
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.beginAbsence({ identifiers: requests.map(({ id }) => id), transaction }),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const persisted = await transaction.find(HRRequest, { id: { $in: requests.map(({ id }) => id) } });
                expect(persisted.find(({ id }) => id === requests[0].id)!.executionStatus).toBe(HRExecutionStatus.APPLIED);
                expect(persisted.find(({ id }) => id === requests[1].id)!.failure).toContain("ABSENCE_OVERLAP");
                expect(persisted.find(({ id }) => id === requests[2].id)!.failure).toContain("INSUFFICIENT_LEAVE_BALANCE");
                expect(
                    await transaction.count(Absence, { sourceRequest: { id: { $in: requests.map(({ id }) => id) } } }),
                ).toBe(1);
            });
        });

        it("[case] - serializes concurrent reservations of the same balance", async () => {
            // Arrange
            const requests = await createBatch(2, true);
            await suite.transaction(async (transaction) => {
                const first = await transaction.findOneOrFail(HRRequest, { id: requests[0].id });
                const second = await transaction.findOneOrFail(HRRequest, { id: requests[1].id });
                first.payload = { startDate: "2030-06-01", endDate: "2030-06-08", poolCode: "ANNUAL", unit: LeaveUnit.DAY };
                second.payload = {
                    startDate: "2030-07-01",
                    endDate: "2030-07-08",
                    poolCode: "ANNUAL",
                    unit: LeaveUnit.DAY,
                };
            });

            // Act
            await Promise.all(
                requests.map(({ id }) =>
                    suite.transaction((transaction) =>
                        suite.repository().service.beginAbsence({ identifiers: [id], transaction }),
                    ),
                ),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const persisted = await transaction.find(HRRequest, { id: { $in: requests.map(({ id }) => id) } });
                expect(
                    persisted.filter(({ executionStatus }) => executionStatus === HRExecutionStatus.APPLIED),
                ).toHaveLength(1);
                expect(
                    persisted.filter(({ executionStatus }) => executionStatus === HRExecutionStatus.FAILED),
                ).toHaveLength(1);
            });
        });

        it("[case] - rolls back absence, reservation and execution state together", async () => {
            // Arrange
            const [request] = await createBatch(1);

            // Act
            await expect(
                suite.transaction(async (transaction) => {
                    await suite.repository().service.beginAbsence({ identifiers: [request.id], transaction });
                    await transaction.flush();
                    throw new Error("rollback absence");
                }),
            ).rejects.toThrow("rollback absence");

            // Assert
            await suite.transaction(async (transaction) => {
                expect(await transaction.count(Absence, { sourceRequest: { id: request.id } })).toBe(0);
                expect(await transaction.count(LeaveLedgerEntry, { sourceRequest: { id: request.id } })).toBe(0);
                expect((await transaction.findOneOrFail(HRRequest, { id: request.id })).executionStatus).toBe(
                    HRExecutionStatus.NOT_STARTED,
                );
            });
        });

        it("[case] - keeps business SQL bounded for 1, 2, 10 and 100 absences", async () => {
            const counts: { reads: number; writes: number }[] = [];
            const advancementCounts: { reads: number; writes: number }[] = [];
            async function measure(count: number): Promise<void> {
                const requests = await createBatch(count);
                await suite.transaction(async (transaction) => {
                    const execute = jest.spyOn(transaction.getConnection(), "execute");
                    try {
                        await suite
                            .repository()
                            .service.beginAbsence({ identifiers: requests.map(({ id }) => id), transaction });
                        await transaction.flush();
                        const queries = execute.mock.calls.map(([sql]) => String(sql).toLowerCase());
                        counts.push({
                            reads: queries.filter((sql) => sql.startsWith("select")).length,
                            writes: queries.filter((sql) => /^(insert|update|delete)/.test(sql)).length,
                        });
                        expect(
                            await transaction.count(Absence, {
                                sourceRequest: { id: { $in: requests.map(({ id }) => id) } },
                            }),
                        ).toBe(count);
                    } finally {
                        execute.mockRestore();
                    }
                });
                await suite.transaction(async (transaction) => {
                    const absences = await transaction.find(Absence, {
                        sourceRequest: { id: { $in: requests.map(({ id }) => id) } },
                    });
                    transaction.clear();
                    const execute = jest.spyOn(transaction.getConnection(), "execute");
                    try {
                        await suite.repository().service.advanceAbsences({
                            identifiers: absences.map(({ id }) => id),
                            transaction,
                            at: new Date("2030-07-01T00:00:00Z"),
                        });
                        await transaction.flush();
                        const queries = execute.mock.calls.map(([sql]) => String(sql).toLowerCase());
                        advancementCounts.push({
                            reads: queries.filter((sql) => sql.startsWith("select")).length,
                            writes: queries.filter((sql) => /^(insert|update|delete)/.test(sql)).length,
                        });
                    } finally {
                        execute.mockRestore();
                    }
                });
            }
            await measure(1);
            await measure(2);
            await measure(10);
            await measure(100);

            expect(advancementCounts[0]).toEqual({ reads: 4, writes: 2 });
            expect(advancementCounts.slice(1)).toEqual(Array.from({ length: 3 }, () => ({ reads: 5, writes: 2 })));
            expect(counts[0]).toEqual({ reads: 9, writes: 3 });
            expect(counts[1]).toEqual({ reads: 10, writes: 3 });
            expect(counts.slice(1)).toEqual(Array.from({ length: 3 }, () => counts[1]));
            expect(counts.every(({ writes }) => writes === 3)).toBe(true);
        });

        it("[case] - calculates scheduled minutes from the employee schedule", async () => {
            // Arrange
            const [request] = await createBatch(1);
            await suite.transaction(async (transaction) => {
                const employee = await transaction.findOneOrFail(
                    Employee,
                    { id: request.employee.id },
                    { populate: ["leavePolicy"] },
                );
                employee.leavePolicy!.rules.push({
                    poolCode: "COMP",
                    unit: "MINUTE",
                    accrualBasis: "NONE",
                    dayCounting: "SCHEDULED_MINUTES",
                    availability: "APPROVAL_ONLY",
                    expiration: null,
                });
                const pending = await transaction.findOneOrFail(HRRequest, { id: request.id });
                pending.payload = {
                    startsAt: "2030-06-01T08:00:00Z",
                    endsAt: "2030-06-01T16:00:00Z",
                    poolCode: "COMP",
                    unit: LeaveUnit.MINUTE,
                };
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.beginAbsence({ identifiers: [request.id], transaction }),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const absence = await transaction.findOneOrFail(Absence, { sourceRequest: { id: request.id } });
                expect(absence.quantity).toBe("480.000000");
                expect(absence.unit).toBe(LeaveUnit.MINUTE);
                expect(absence.calculationSnapshot).toMatchObject({
                    dayCounting: "SCHEDULED_MINUTES",
                    scheduleRevision: 1,
                });
            });
        });

        it("[case] - skips future and unapproved requests and records invalid employee and pool failures", async () => {
            // Arrange
            const requests = await createBatch(4);
            await suite.transaction(async (transaction) => {
                const pending = await transaction.find(HRRequest, { id: { $in: requests.map(({ id }) => id) } });
                pending.find(({ id }) => id === requests[0].id)!.effectiveAt = new Date("2031-01-01T00:00:00Z");
                pending.find(({ id }) => id === requests[1].id)!.status = HRRequestStatus.SUBMITTED;
                pending.find(({ id }) => id === requests[2].id)!.payload.poolCode = "UNKNOWN";
                const employee = await transaction.findOneOrFail(Employee, { id: requests[3].employee.id });
                employee.status = EmployeeStatus.TERMINATED;
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.beginAbsence({ identifiers: requests.map(({ id }) => id), transaction }),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const pending = await transaction.find(HRRequest, { id: { $in: requests.map(({ id }) => id) } });
                expect(
                    pending.filter(({ executionStatus }) => executionStatus === HRExecutionStatus.NOT_STARTED),
                ).toHaveLength(2);
                expect(pending.filter(({ executionStatus }) => executionStatus === HRExecutionStatus.FAILED)).toHaveLength(
                    2,
                );
                expect(
                    await transaction.count(Absence, { sourceRequest: { id: { $in: requests.map(({ id }) => id) } } }),
                ).toBe(0);
            });
        });

        it("[case] - rolls back a failed advancement and serializes concurrent consumption", async () => {
            // Arrange
            const [request] = await createBatch(1);
            await suite.transaction((transaction) =>
                suite.repository().service.beginAbsence({ identifiers: [request.id], transaction }),
            );
            const absence = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Absence, { sourceRequest: { id: request.id } }),
            );
            const at = new Date("2030-06-01T00:00:00Z");

            // Act
            await expect(
                suite.transaction(async (transaction) => {
                    await suite.repository().service.advanceAbsences({ identifiers: [absence.id], transaction, at });
                    await transaction.flush();
                    throw new Error("rollback consumption");
                }),
            ).rejects.toThrow("rollback consumption");
            await suite.transaction(async (transaction) => {
                expect(await transaction.count(LeaveLedgerEntry, { sourceRequest: { id: request.id } })).toBe(1);
                expect((await transaction.findOneOrFail(Absence, { id: absence.id })).status).toBe(AbsenceStatus.SCHEDULED);
            });
            await Promise.all(
                [1, 2].map(() =>
                    suite.transaction((transaction) =>
                        suite.repository().service.advanceAbsences({ identifiers: [absence.id], transaction, at }),
                    ),
                ),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                expect(await transaction.count(LeaveLedgerEntry, { sourceRequest: { id: request.id } })).toBe(3);
                expect((await transaction.findOneOrFail(Absence, { id: absence.id })).status).toBe(
                    AbsenceStatus.IN_PROGRESS,
                );
            });
        });

        it("[case] - selects due absences by each timezone and advances overdue absences in one pass", async () => {
            // Arrange
            const [request] = await createBatch(1);
            await suite.transaction((transaction) =>
                suite.repository().service.beginAbsence({ identifiers: [request.id], transaction }),
            );

            // Act
            const before = await suite
                .repository()
                .repositories.absence.findDue({ at: new Date("2030-05-31T22:59:00Z"), limit: 100 });
            const due = await suite
                .repository()
                .repositories.absence.findDue({ at: new Date("2030-05-31T23:00:00Z"), limit: 100 });
            const absence = due.find(({ sourceRequest }) => sourceRequest.id === request.id)!;
            await suite.transaction((transaction) =>
                suite.repository().service.advanceAbsences({
                    identifiers: [absence.id],
                    at: new Date("2030-07-01T00:00:00Z"),
                    transaction,
                }),
            );

            // Assert
            expect(before.some(({ sourceRequest }) => sourceRequest.id === request.id)).toBe(false);
            await suite.transaction(async (transaction) => {
                expect((await transaction.findOneOrFail(Absence, { id: absence.id })).status).toBe(AbsenceStatus.COMPLETED);
                expect(await transaction.count(LeaveLedgerEntry, { sourceRequest: { id: request.id } })).toBe(3);
            });
        });
    });

    describe("[Method] - adjustLeave", () => {
        async function createBatch(count: number): Promise<HRRequest<HRRequestType.LEAVE_ADJUSTMENT>[]> {
            const organization = await suite.fixtures().createOrganization();
            const leavePolicy = await suite.fixtures().createLeavePolicy({ organization });
            const employee = await suite.fixtures().createEmployee({ status: EmployeeStatus.ACTIVE, organization });

            return await suite.transaction(async (transaction) => {
                const requests = Array.from(
                    { length: count },
                    () =>
                        new HRRequest({
                            executionStatus: HRExecutionStatus.NOT_STARTED,
                            payloadSchemaVersion: 1,
                            initiatorAccount: randomUUID(),
                            approvedRevision: 1,
                            revision: 1,
                            idempotencyKey: randomUUID(),
                            organization,
                            employee,
                            status: HRRequestStatus.APPROVED,
                            type: HRRequestType.LEAVE_ADJUSTMENT,
                            payload: {
                                balanceDelta: "2.250001",
                                leavePolicy: leavePolicy.id,
                                effectiveOn: "2026-01-01",
                                poolCode: "ANNUAL",
                                reason: "Correct opening balance",
                                unit: LeaveUnit.DAY,
                            },
                        }),
                );
                transaction.persist(requests);
                await transaction.flush();
                return requests;
            });
        }

        it("[case] - posts signed corrections once without changing reservations", async () => {
            // Arrange
            const requests = await createBatch(2);
            const identifiers = requests.map(({ id }) => id);
            await suite.transaction(async (transaction) => {
                const request = await transaction.findOneOrFail(HRRequest, { id: requests[1].id });
                request.payload = { ...request.payload, balanceDelta: "-1.250000" };
            });

            // Act
            await suite.transaction((transaction) => suite.repository().service.adjustLeave({ identifiers, transaction }));
            await suite.transaction((transaction) => suite.repository().service.adjustLeave({ identifiers, transaction }));

            // Assert
            await suite.transaction(async (transaction) => {
                const entries = await transaction.find(LeaveLedgerEntry, { sourceRequest: { id: { $in: identifiers } } });
                const persisted = await transaction.find(HRRequest, { id: { $in: identifiers } });
                expect(entries).toHaveLength(2);
                expect(entries.map(({ balanceDelta }) => balanceDelta).sort()).toEqual(["-1.250000", "2.250001"]);
                expect(entries.every(({ reservedDelta }) => reservedDelta === "0.000000")).toBe(true);
                expect(persisted.every(({ executionStatus }) => executionStatus === HRExecutionStatus.APPLIED)).toBe(true);
                for (const entry of entries) {
                    expect(entry.idempotencyKey).toBe(entry.sourceRequest!.id);
                    expect(entry.calculationSnapshot).toMatchObject({ policyRevision: 1, poolCode: "ANNUAL" });
                    expect(persisted.find(({ id }) => id === entry.sourceRequest!.id)!.result).toEqual({
                        leaveLedgerEntry: entry.id,
                        employee: entry.employee.id,
                    });
                }
            });
        });

        it("[case] - isolates invalid policies and pools while skipping future and unapproved requests", async () => {
            // Arrange
            const requests = await createBatch(7);
            const foreignPolicy = await suite.fixtures().createLeavePolicy();
            const archivedPolicy = await suite.fixtures().createLeavePolicy({
                organization: requests[0].organization,
                status: RecordStatus.ARCHIVED,
            });
            await suite.transaction(async (transaction) => {
                const loaded = await transaction.find(HRRequest, { id: { $in: requests.map(({ id }) => id) } });
                const byId = new Map(loaded.map((request) => [request.id, request]));
                for (const [index, leavePolicy] of [randomUUID(), foreignPolicy.id, archivedPolicy.id].entries()) {
                    const request = byId.get(requests[index + 1].id)!;
                    request.payload = { ...request.payload, leavePolicy };
                }
                const invalidPool = byId.get(requests[4].id)!;
                invalidPool.payload = { ...invalidPool.payload, unit: LeaveUnit.MINUTE };
                byId.get(requests[5].id)!.effectiveAt = new Date("2999-01-01T00:00:00.000Z");
                byId.get(requests[6].id)!.status = HRRequestStatus.SUBMITTED;
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.adjustLeave({
                    identifiers: requests.map(({ id }) => id),
                    transaction,
                }),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                const loaded = await transaction.find(HRRequest, { id: { $in: requests.map(({ id }) => id) } });
                const byId = new Map(loaded.map((request) => [request.id, request]));
                expect(byId.get(requests[0].id)!.executionStatus).toBe(HRExecutionStatus.APPLIED);
                for (const request of requests.slice(1, 5)) {
                    expect(byId.get(request.id)!.executionStatus).toBe(HRExecutionStatus.FAILED);
                    expect(byId.get(request.id)!.failure).toBeTruthy();
                }
                for (const request of requests.slice(5)) {
                    expect(byId.get(request.id)!.executionStatus).toBe(HRExecutionStatus.NOT_STARTED);
                }
                expect(await transaction.count(LeaveLedgerEntry, { organization: requests[0].organization.id })).toBe(1);
            });
        });

        it("[case] - serializes concurrent execution of the same approved request", async () => {
            // Arrange
            const [request] = await createBatch(1);

            // Act
            await Promise.all(
                Array.from({ length: 2 }, () =>
                    suite.transaction((transaction) =>
                        suite.repository().service.adjustLeave({ identifiers: [request.id], transaction }),
                    ),
                ),
            );

            // Assert
            await suite.transaction(async (transaction) => {
                expect(await transaction.count(LeaveLedgerEntry, { sourceRequest: { id: request.id } })).toBe(1);
                expect((await transaction.findOneOrFail(HRRequest, { id: request.id })).executionStatus).toBe(
                    HRExecutionStatus.APPLIED,
                );
            });
        });

        it("[case] - rolls back both ledger entries and request execution when the transaction fails", async () => {
            // Arrange
            const [request] = await createBatch(1);

            // Act
            const result = suite.transaction(async (transaction) => {
                await suite.repository().service.adjustLeave({ identifiers: [request.id], transaction });
                await transaction.flush();
                throw new Error("rollback adjustment batch");
            });

            // Assert
            await expect(result).rejects.toThrow("rollback adjustment batch");
            await suite.transaction(async (transaction) => {
                expect(await transaction.count(LeaveLedgerEntry, { sourceRequest: { id: request.id } })).toBe(0);
                expect((await transaction.findOneOrFail(HRRequest, { id: request.id })).executionStatus).toBe(
                    HRExecutionStatus.NOT_STARTED,
                );
            });
        });

        it("[case] - bounds business SQL count for 1, 2, 10 and 100 adjustments", async () => {
            async function measure(count: number): Promise<{ reads: number; writes: number }> {
                const requests = await createBatch(count);
                return await suite.transaction(async (transaction) => {
                    const execute = jest.spyOn(transaction.getConnection(), "execute");
                    try {
                        await suite.repository().service.adjustLeave({
                            identifiers: requests.map(({ id }) => id),
                            transaction,
                        });
                        await transaction.flush();
                        const queries = execute.mock.calls.map(([sql]) => String(sql).toLowerCase());
                        return {
                            reads: queries.filter((sql) => sql.startsWith("select")).length,
                            writes: queries.filter((sql) => /^(insert|update|delete)/.test(sql)).length,
                        };
                    } finally {
                        execute.mockRestore();
                    }
                });
            }

            // Act
            const counts = [await measure(1), await measure(2), await measure(10), await measure(100)];

            // Assert
            expect(counts[0]).toEqual({ reads: 4, writes: 2 });
            expect(counts[1]).toEqual({ reads: 5, writes: 2 });
            expect(counts.slice(1)).toEqual(Array.from({ length: 3 }, () => counts[1]));
            expect(counts[1].writes).toBe(2);
        });
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
                    const payload: Entities.HRRequest.Payload.ChangeTerms = {
                        termsValidFrom: "2026-02-01",
                        contractType: "fixed-term",
                    };
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
