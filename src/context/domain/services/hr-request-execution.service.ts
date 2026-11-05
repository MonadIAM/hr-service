import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";
import { DateTime } from "luxon";

import { Exception } from "~common/exceptions";
import {
    WORK_CALENDAR_EXCEPTION_REPOSITORY,
    POSITION_ASSIGNMENT_REPOSITORY,
    LEAVE_LEDGER_ENTRY_REPOSITORY,
    WORK_CALENDAR_REPOSITORY,
    WORK_SCHEDULE_REPOSITORY,
    LEAVE_POLICY_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    EMPLOYEE_REPOSITORY,
    POSITION_REPOSITORY,
    ABSENCE_REPOSITORY,
} from "~context/infrastructure/repositories";
import {
    PositionAssignmentStatus,
    HRExecutionStatus,
    HRRequestStatus,
    LeaveLedgerKind,
    EmployeeStatus,
    HRRequestType,
    AbsenceStatus,
    RecordStatus,
    LeaveUnit,
} from "~context/enums";

import { PositionAssignment, LeaveLedgerEntry, Absence } from "../entities";
import { EMPLOYEE_SERVICE } from "./tokens";

@Injectable({ scope: Scope.DEFAULT })
export class HRRequestExecutionService implements Services.HRRequestExecution.Contract {
    private readonly dictionaryPath = "services.hr-request-execution";

    public constructor(
        @Inject(EMPLOYEE_SERVICE)
        private readonly employeeService: Services.Employee.ProcessorContract,
        @Inject(WORK_CALENDAR_EXCEPTION_REPOSITORY)
        private readonly workCalendarExceptionRepository: Repositories.WorkCalendarException.Contract,
        @Inject(POSITION_ASSIGNMENT_REPOSITORY)
        private readonly positionAssignmentRepository: Repositories.PositionAssignment.Contract,
        @Inject(LEAVE_LEDGER_ENTRY_REPOSITORY)
        private readonly leaveLedgerEntryRepository: Repositories.LeaveLedgerEntry.Contract,
        @Inject(WORK_CALENDAR_REPOSITORY)
        private readonly workCalendarRepository: Repositories.WorkCalendar.Contract,
        @Inject(WORK_SCHEDULE_REPOSITORY)
        private readonly workScheduleRepository: Repositories.WorkSchedule.Contract,
        @Inject(LEAVE_POLICY_REPOSITORY)
        private readonly leavePolicyRepository: Repositories.LeavePolicy.Contract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: Repositories.Employee.Contract,
        @Inject(POSITION_REPOSITORY)
        private readonly positionRepository: Repositories.Position.Contract,
        @Inject(ABSENCE_REPOSITORY)
        private readonly absenceRepository: Repositories.Absence.Contract,
    ) {}

    public async beginHire(
        props: Services.HRRequestExecution.BeginHire.Props,
    ): Services.HRRequestExecution.BeginHire.Result {
        const { transaction, identifiers } = props;
        const requests = (await this.hrRequestRepository.find({
            options: {
                populate: ["organization"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { effectiveAt: "ASC", createdAt: "ASC", id: "ASC" },
                strategy: "select-in",
                refresh: true,
            },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: new Date() } }, { effectiveAt: null }],
                type: { $in: [HRRequestType.HIRE, HRRequestType.REHIRE] },
                status: HRRequestStatus.APPROVED,
                id: { $in: identifiers },
            },
            transaction,
        })) as Entities.HRRequest<HRRequestType.HIRE | HRRequestType.REHIRE>[];

        if (requests.length) {
            const employeeIds = [...new Set(requests.map(({ employee }) => employee.id))];
            const positionIds = [...new Set(requests.map(({ payload }) => payload.position))];
            const employees = await this.employeeRepository.find({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                where: { id: { $in: employeeIds } },
                transaction,
            });
            const positions = await this.positionRepository.find({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                where: { id: { $in: positionIds } },
                transaction,
            });
            const [assignments, calendars, schedules, policies] = await Promise.all([
                this.positionAssignmentRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                    where: {
                        $or: [{ employee: { id: { $in: employeeIds } } }, { position: { id: { $in: positionIds } } }],
                        status: { $in: [PositionAssignmentStatus.RESERVED, PositionAssignmentStatus.ACTIVE] },
                    },
                    transaction,
                }),
                this.workCalendarRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: { id: { $in: [...new Set(requests.map(({ payload }) => payload.workCalendar))] } },
                    transaction,
                }),
                this.workScheduleRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: { id: { $in: [...new Set(requests.map(({ payload }) => payload.workSchedule))] } },
                    transaction,
                }),
                this.leavePolicyRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: { id: { $in: [...new Set(requests.map(({ payload }) => payload.leavePolicy))] } },
                    transaction,
                }),
            ]);
            const assignmentsByEmployee = new Map(assignments.map((entity) => [entity.employee.id, entity]));
            const assignmentsByPosition = new Map(assignments.map((entity) => [entity.position.id, entity]));
            const employeesById = new Map(employees.map((entity) => [entity.id, entity]));
            const positionsById = new Map(positions.map((entity) => [entity.id, entity]));
            const calendarsById = new Map(calendars.map((entity) => [entity.id, entity]));
            const schedulesById = new Map(schedules.map((entity) => [entity.id, entity]));
            const policiesById = new Map(policies.map((entity) => [entity.id, entity]));

            for (const request of requests) {
                const employee = employeesById.get(request.employee.id)!;
                const position = positionsById.get(request.payload.position);
                const workCalendar = calendarsById.get(request.payload.workCalendar);
                const workSchedule = schedulesById.get(request.payload.workSchedule);
                const leavePolicy = policiesById.get(request.payload.leavePolicy);
                const status = request.type === HRRequestType.HIRE ? EmployeeStatus.DRAFT : EmployeeStatus.TERMINATED;

                try {
                    request.beginApplication();
                    if (employee.status !== status) {
                        throw Exception.invariantViolation({
                            messageKey: `${this.dictionaryPath}.INVALID_EMPLOYEE_STATUS`,
                        });
                    } else if (!workCalendar || !workSchedule || !leavePolicy) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.TERMS_NOT_FOUND` });
                    } else if (!position) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.PLACEMENT_NOT_FOUND` });
                    } else if (request.targetPosition && request.targetPosition.id !== position.id) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.POSITION_MISMATCH` });
                    } else if (assignmentsByEmployee.has(employee.id) || assignmentsByPosition.has(position.id)) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.POSITION_OCCUPIED` });
                    } else {
                        const input = { ...request.payload, workCalendar, workSchedule, leavePolicy };
                        employee.canHire(input);
                        const assignment = new PositionAssignment({
                            placementSnapshot: {
                                department: position.department,
                                title: position.title,
                                grade: position.grade,
                                code: position.code,
                                team: position.team,
                            },
                            status: PositionAssignmentStatus.RESERVED,
                            salaryCurrency: request.payload.salaryCurrency,
                            validFrom: request.payload.employmentStartedOn,
                            salaryAmount: request.payload.salaryAmount,
                            salaryPeriod: request.payload.salaryPeriod,
                            organization: request.organization,
                            department: position.department,
                            positionTitle: position.title,
                            fte: request.payload.fte,
                            sourceRequest: request,
                            grade: position.grade,
                            team: position.team,
                            employee,
                            position,
                        });
                        assignment.canCreate();

                        if (employee.account) {
                            employee.reserve(request.id);
                            position.reserve(request.id);
                        } else {
                            employee.hire(input);
                            assignment.activate();
                            request.markApplied({ result: { assignment: assignment.id, employee: employee.id } });
                        }

                        transaction.persist(assignment);
                        assignmentsByEmployee.set(employee.id, assignment);
                        assignmentsByPosition.set(position.id, assignment);
                    }
                } catch (error) {
                    if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                        throw error;
                    } else {
                        request.markFailed({ reason: error.message });
                    }
                }
            }
        }

        return requests;
    }

    public async completeHire(
        props: Services.HRRequestExecution.CompleteHire.Props,
    ): Services.HRRequestExecution.CompleteHire.Result {
        const { transaction, input, realm } = props;
        const request = (await this.hrRequestRepository.findUnique({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            where: {
                organization: { id: input.organization, realm },
                type: { $in: [HRRequestType.HIRE, HRRequestType.REHIRE] },
                executionStatus: HRExecutionStatus.RUNNING,
                employee: { account: input.account },
                id: input.process,
            },
            transaction,
        })) as Nullable<Entities.HRRequest<HRRequestType.HIRE | HRRequestType.REHIRE>>;

        if (request) {
            const employee = await this.employeeRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
                where: { organization: input.organization, reservation: request.id, id: request.employee.id },
                transaction,
            });
            const position = await this.positionRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
                where: { organization: input.organization, reservation: request.id, id: request.payload.position },
                transaction,
            });
            const assignment = await this.positionAssignmentRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
                where: {
                    status: PositionAssignmentStatus.RESERVED,
                    organization: input.organization,
                    sourceRequest: { id: request.id },
                },
                transaction,
            });

            if ("reason" in input) {
                employee.release(request.id);
                position.release(request.id);
                assignment.release();
                request.markFailed({ reason: input.reason });
            } else {
                const [workCalendar, workSchedule, leavePolicy] = await Promise.all([
                    this.workCalendarRepository.findUniqueOrThrow({
                        options: { lockMode: LockMode.PESSIMISTIC_READ, refresh: true },
                        where: { organization: input.organization, id: request.payload.workCalendar },
                        transaction,
                    }),
                    this.workScheduleRepository.findUniqueOrThrow({
                        options: { lockMode: LockMode.PESSIMISTIC_READ, refresh: true },
                        where: { organization: input.organization, id: request.payload.workSchedule },
                        transaction,
                    }),
                    this.leavePolicyRepository.findUniqueOrThrow({
                        options: { lockMode: LockMode.PESSIMISTIC_READ, refresh: true },
                        where: { organization: input.organization, id: request.payload.leavePolicy },
                        transaction,
                    }),
                ]);

                employee.release(request.id);
                position.release(request.id);
                employee.hire({ ...request.payload, workCalendar, workSchedule, leavePolicy });
                assignment.activate();
                request.markApplied({
                    result: { assignment: assignment.id, employee: employee.id, account: input.account },
                });
            }
        }
    }

    public async recordOvertime(
        props: Services.HRRequestExecution.RecordOvertime.Props,
    ): Services.HRRequestExecution.RecordOvertime.Result {
        const { transaction, identifiers } = props;
        const at = new Date();
        const requests = (await this.hrRequestRepository.find({
            options: {
                populate: ["organization"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { effectiveAt: "ASC", createdAt: "ASC", id: "ASC" },
                strategy: "select-in",
                refresh: true,
            },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: at } }, { effectiveAt: null }],
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.OVERTIME,
                id: { $in: identifiers },
            },
            transaction,
        })) as Entities.HRRequest<HRRequestType.OVERTIME>[];

        if (requests.length) {
            const employeeIds = [...new Set(requests.map(({ employee }) => employee.id))];
            const dates = [...new Set(requests.map(({ payload }) => payload.date))].sort();
            const employees = await this.employeeRepository.find({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                where: { id: { $in: employeeIds } },
                transaction,
            });
            const [assignments, recorded] = await Promise.all([
                this.positionAssignmentRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: {
                        status: { $in: [PositionAssignmentStatus.ACTIVE, PositionAssignmentStatus.CLOSED] },
                        $or: [{ validTo: { $gt: dates[0] } }, { validTo: null }],
                        validFrom: { $lte: dates[dates.length - 1] },
                        employee: { id: { $in: employeeIds } },
                    },
                    transaction,
                }),
                this.hrRequestRepository.find({
                    where: {
                        executionStatus: HRExecutionStatus.APPLIED,
                        employee: { id: { $in: employeeIds } },
                        status: HRRequestStatus.APPROVED,
                        payload: { date: { $in: dates } },
                        type: HRRequestType.OVERTIME,
                    },
                    transaction,
                }),
            ]);
            const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
            const assignmentsByEmployee = new Map<string, Entities.PositionAssignment[]>();
            const recordedDays = new Set(
                recorded.map(
                    (request) => `${request.employee.id}/${(request.payload as Entities.HRRequest.Payload.Overtime).date}`,
                ),
            );
            for (const assignment of assignments) {
                const values = assignmentsByEmployee.get(assignment.employee.id) ?? [];
                values.push(assignment);
                assignmentsByEmployee.set(assignment.employee.id, values);
            }

            for (const request of requests) {
                const employee = employeesById.get(request.employee.id)!;
                const { endTime, date } = request.payload;
                const end = DateTime.fromISO(`${date}T${endTime}`, { zone: employee.scheduleTimezone });
                const effectiveAt = DateTime.max(...end.getPossibleOffsets())!.toJSDate();
                const key = `${employee.id}/${date}`;

                try {
                    request.canApply();
                    if (effectiveAt > at) {
                        request.scheduleApplication({ effectiveAt });
                    } else {
                        request.beginApplication();
                        employee.assertReady();
                        const assignments = (assignmentsByEmployee.get(employee.id) ?? []).filter(
                            (assignment) =>
                                assignment.validFrom <= date && (!assignment.validTo || date < assignment.validTo),
                        );

                        if (![EmployeeStatus.ACTIVE, EmployeeStatus.TERMINATED].includes(employee.status)) {
                            throw Exception.invariantViolation({
                                messageKey: `${this.dictionaryPath}.INVALID_EMPLOYEE_STATUS`,
                            });
                        } else if (employee.termsValidFrom && date < employee.termsValidFrom) {
                            throw Exception.invariantViolation({
                                messageKey: `${this.dictionaryPath}.OVERTIME_TERMS_MISMATCH`,
                            });
                        } else if (assignments.length !== 1) {
                            throw Exception.invariantViolation({
                                messageKey: `${this.dictionaryPath}.PLACEMENT_NOT_FOUND`,
                            });
                        } else if (recordedDays.has(key)) {
                            throw Exception.invariantViolation({
                                messageKey: `${this.dictionaryPath}.OVERTIME_ALREADY_RECORDED`,
                            });
                        } else {
                            request.markApplied({ result: request.calculateOvertime({ assignment: assignments[0] }) });
                            recordedDays.add(key);
                        }
                    }
                } catch (error) {
                    if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                        throw error;
                    } else {
                        request.markFailed({ reason: error.message });
                    }
                }
            }
        }

        return requests;
    }

    public async beginAbsence(
        props: Services.HRRequestExecution.BeginAbsence.Props,
    ): Services.HRRequestExecution.BeginAbsence.Result {
        const { transaction, identifiers } = props;
        const at = new Date();
        const requests = (await this.hrRequestRepository.find({
            options: {
                populate: ["organization"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { effectiveAt: "ASC", createdAt: "ASC", id: "ASC" },
                strategy: "select-in",
                refresh: true,
            },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: at } }, { effectiveAt: null }],
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.ABSENCE,
                id: { $in: identifiers },
            },
            transaction,
        })) as Entities.HRRequest<HRRequestType.ABSENCE>[];

        if (requests.length) {
            const employeeIds = [...new Set(requests.map(({ employee }) => employee.id))];
            const employees = await this.employeeRepository.find({
                options: {
                    populate: ["workCalendar", "workSchedule", "leavePolicy"],
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    orderBy: { id: "ASC" },
                    strategy: "select-in",
                    refresh: true,
                },
                where: { id: { $in: employeeIds } },
                transaction,
            });

            const boundaries = requests.flatMap(({ payload }) =>
                payload.unit === LeaveUnit.DAY
                    ? [Date.parse(payload.startDate), Date.parse(payload.endDate)]
                    : [Date.parse(payload.startsAt), Date.parse(payload.endsAt)],
            );
            const from = new Date(Math.min(...boundaries) - 86400000);
            const to = new Date(Math.max(...boundaries) + 86400000);

            const [exceptions, absences, balances] = await Promise.all([
                this.workCalendarExceptionRepository.find({
                    where: {
                        calendar: {
                            id: {
                                $in: [
                                    ...new Set(
                                        employees.flatMap(({ workCalendar }) => (workCalendar ? [workCalendar.id] : [])),
                                    ),
                                ],
                            },
                        },
                        date: { $gte: from.toISOString().slice(0, 10), $lte: to.toISOString().slice(0, 10) },
                    },
                    transaction,
                }),
                this.absenceRepository.find({
                    where: {
                        $or: [
                            {
                                startDate: { $lt: to.toISOString().slice(0, 10) },
                                endDate: { $gt: from.toISOString().slice(0, 10) },
                            },
                            { startsAt: { $lt: to }, endsAt: { $gt: from } },
                        ],
                        employee: { id: { $in: employeeIds } },
                        status: { $ne: AbsenceStatus.CANCELLED },
                    },
                    transaction,
                }),
                this.leaveLedgerEntryRepository.getBalances({ employees: employeeIds, transaction, at }),
            ]);

            const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
            const periodsByEmployee = new Map<string, [Date, Date][]>();

            for (const absence of absences) {
                const periods = periodsByEmployee.get(absence.employee.id) ?? [];
                periods.push(absence.period());
                periodsByEmployee.set(absence.employee.id, periods);
            }

            const available = new Map(
                balances.map((balance) => [
                    `${balance.employee}/${balance.poolCode}/${balance.unit}`,
                    this.leaveAmount(balance.available),
                ]),
            );

            for (const request of requests) {
                const employee = employeesById.get(request.employee.id)!;
                const { leavePolicy, workSchedule, workCalendar } = employee;
                try {
                    request.beginApplication();
                    employee.assertReady();
                    if (employee.status !== EmployeeStatus.ACTIVE) {
                        throw Exception.invariantViolation({
                            messageKey: `${this.dictionaryPath}.INVALID_EMPLOYEE_STATUS`,
                        });
                    } else if (!leavePolicy || !workSchedule || !workCalendar) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.TERMS_NOT_FOUND` });
                    } else if (leavePolicy.status === RecordStatus.ARCHIVED) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.ARCHIVED_LEAVE_POLICY` });
                    } else {
                        const absence = new Absence({
                            calculationSnapshot: {},
                            sourceRequest: request,
                            sourceItemKey: "main",
                            organization: request.organization,
                            leavePolicy,
                            timezone: employee.scheduleTimezone!,
                            poolCode: request.payload.poolCode,
                            quantity: "0",
                            employee,
                            status: AbsenceStatus.SCHEDULED,
                            unit: request.payload.unit,
                            ...(request.payload.unit === LeaveUnit.DAY
                                ? { startDate: request.payload.startDate, endDate: request.payload.endDate }
                                : {
                                      startsAt: new Date(request.payload.startsAt),
                                      endsAt: new Date(request.payload.endsAt),
                                  }),
                        });
                        absence.canCreate();
                        absence.calculate({
                            exceptions: exceptions.filter(({ calendar }) => calendar.id === workCalendar.id),
                        });
                        const [start, end] = absence.period();
                        const periods = periodsByEmployee.get(employee.id) ?? [];
                        const overlaps = periods.some(([otherStart, otherEnd]) => start < otherEnd && end > otherStart);
                        const rule = leavePolicy.rules.find(
                            ({ poolCode, unit }) => poolCode === absence.poolCode && unit === absence.unit,
                        )!;
                        const key = `${employee.id}/${absence.poolCode}/${absence.unit}`;
                        const quantity = this.leaveAmount(absence.quantity);
                        const balance = available.get(key) ?? 0n;
                        if (overlaps) {
                            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.ABSENCE_OVERLAP` });
                        } else if (rule.availability === "BALANCE" && balance < quantity) {
                            throw Exception.invariantViolation({
                                messageKey: `${this.dictionaryPath}.INSUFFICIENT_LEAVE_BALANCE`,
                            });
                        } else {
                            const entry = new LeaveLedgerEntry({
                                calculationSnapshot: absence.calculationSnapshot,
                                idempotencyKey: `reserve/${request.id}`,
                                reservedDelta: absence.quantity,
                                sourceRequest: request,
                                organization: request.organization,
                                balanceDelta: "0",
                                effectiveOn: new Intl.DateTimeFormat("sv-SE", { timeZone: absence.timezone }).format(at),
                                leavePolicy,
                                poolCode: absence.poolCode,
                                employee,
                                absence,
                                reason: "Approved absence",
                                kind: LeaveLedgerKind.RESERVE,
                                unit: absence.unit,
                            });
                            entry.canCreate();
                            transaction.persist([absence, entry]);
                            available.set(key, balance - quantity);
                            periods.push([start, end]);
                            periodsByEmployee.set(employee.id, periods);
                            request.markApplied({ result: { absence: absence.id, employee: employee.id } });
                        }
                    }
                } catch (error) {
                    if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                        throw error;
                    } else {
                        request.markFailed({ reason: error.message });
                    }
                }
            }
        }
        return requests;
    }

    public async advanceAbsences(
        props: Services.HRRequestExecution.AdvanceAbsences.Props,
    ): Services.HRRequestExecution.AdvanceAbsences.Result {
        const { transaction, identifiers, at } = props;
        const absences = await this.absenceRepository.find({
            options: {
                populate: ["leavePolicy", "sourceRequest", "employee"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { id: "ASC" },
                strategy: "select-in",
                refresh: true,
            },
            where: {
                status: { $in: [AbsenceStatus.SCHEDULED, AbsenceStatus.IN_PROGRESS] },
                id: { $in: identifiers },
            },
            transaction,
        });
        for (const absence of absences) {
            const [start, end] = absence.period();
            if (absence.status === AbsenceStatus.SCHEDULED && at >= start) {
                for (const kind of [LeaveLedgerKind.RELEASE, LeaveLedgerKind.CONSUME]) {
                    const entry = new LeaveLedgerEntry({
                        calculationSnapshot: absence.calculationSnapshot,
                        idempotencyKey: `${kind.toLowerCase()}/${absence.sourceRequest.id}`,
                        reservedDelta: kind === LeaveLedgerKind.RELEASE ? `-${absence.quantity}` : "0",
                        sourceRequest: absence.sourceRequest,
                        balanceDelta: kind === LeaveLedgerKind.CONSUME ? `-${absence.quantity}` : "0",
                        organization: absence.organization,
                        effectiveOn: new Intl.DateTimeFormat("sv-SE", { timeZone: absence.timezone }).format(start),
                        leavePolicy: absence.leavePolicy,
                        employee: absence.employee,
                        poolCode: absence.poolCode,
                        absence,
                        reason: "Started absence",
                        unit: absence.unit,
                        kind,
                    });
                    entry.canCreate();
                    transaction.persist(entry);
                }
                absence.advanceStatus({ at });
            } else if (absence.status === AbsenceStatus.IN_PROGRESS && at >= end) {
                absence.advanceStatus({ at });
            }
        }
        return absences;
    }

    public async adjustLeave(
        props: Services.HRRequestExecution.AdjustLeave.Props,
    ): Services.HRRequestExecution.AdjustLeave.Result {
        const { transaction, identifiers } = props;
        const requests = (await this.hrRequestRepository.find({
            options: {
                populate: ["organization"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { effectiveAt: "ASC", createdAt: "ASC", id: "ASC" },
                strategy: "select-in",
                refresh: true,
            },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: new Date() } }, { effectiveAt: null }],
                type: HRRequestType.LEAVE_ADJUSTMENT,
                status: HRRequestStatus.APPROVED,
                id: { $in: identifiers },
            },
            transaction,
        })) as Entities.HRRequest<HRRequestType.LEAVE_ADJUSTMENT>[];

        if (requests.length) {
            const [employees, policies] = await Promise.all([
                this.employeeRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                    where: { id: { $in: [...new Set(requests.map(({ employee }) => employee.id))] } },
                    transaction,
                }),
                this.leavePolicyRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: { id: { $in: [...new Set(requests.map(({ payload }) => payload.leavePolicy))] } },
                    transaction,
                }),
            ]);

            const employeesById = new Map(employees.map((entity) => [entity.id, entity]));
            const policiesById = new Map(policies.map((entity) => [entity.id, entity]));

            for (const request of requests) {
                const employee = employeesById.get(request.employee.id)!;
                const leavePolicy = policiesById.get(request.payload.leavePolicy);

                try {
                    request.beginApplication();
                    employee.assertReady();

                    if (![EmployeeStatus.ACTIVE, EmployeeStatus.TERMINATED].includes(employee.status)) {
                        throw Exception.invariantViolation({
                            messageKey: `${this.dictionaryPath}.INVALID_EMPLOYEE_STATUS`,
                        });
                    } else if (!leavePolicy) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.TERMS_NOT_FOUND` });
                    } else if (leavePolicy.status === RecordStatus.ARCHIVED) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.ARCHIVED_LEAVE_POLICY` });
                    } else {
                        const entry = new LeaveLedgerEntry({
                            calculationSnapshot: { ...request.payload, policyRevision: leavePolicy.revision },
                            balanceDelta: request.payload.balanceDelta,
                            effectiveOn: request.payload.effectiveOn,
                            organization: request.organization,
                            poolCode: request.payload.poolCode,
                            kind: LeaveLedgerKind.ADJUSTMENT,
                            reason: request.payload.reason,
                            unit: request.payload.unit,
                            idempotencyKey: request.id,
                            sourceRequest: request,
                            reservedDelta: "0",
                            leavePolicy,
                            employee,
                        });
                        entry.canCreate();
                        transaction.persist(entry);
                        request.markApplied({ result: { leaveLedgerEntry: entry.id, employee: employee.id } });
                    }
                } catch (error) {
                    if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                        throw error;
                    } else {
                        request.markFailed({ reason: error.message });
                    }
                }
            }
        }

        return requests;
    }

    public async changeTerms(
        props: Services.HRRequestExecution.ChangeTerms.Props,
    ): Services.HRRequestExecution.ChangeTerms.Result {
        const { transaction, identifiers } = props;
        const requests = await this.hrRequestRepository.find({
            options: {
                populate: ["organization"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { effectiveAt: "ASC", createdAt: "ASC", id: "ASC" },
                strategy: "select-in",
                refresh: true,
            },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: new Date() } }, { effectiveAt: null }],
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.CHANGE_TERMS,
                id: { $in: identifiers },
            },
            transaction,
        });

        if (requests.length) {
            const pending = requests as Entities.HRRequest<HRRequestType.CHANGE_TERMS>[];
            const values = pending.map(({ payload }) => payload);
            const [employees, calendars, schedules, policies] = await Promise.all([
                this.employeeRepository.find({
                    options: {
                        populate: ["workCalendar", "workSchedule", "leavePolicy"],
                        lockMode: LockMode.PESSIMISTIC_WRITE,
                        orderBy: { id: "ASC" },
                        strategy: "select-in",
                        refresh: true,
                    },
                    where: { id: { $in: [...new Set(pending.map(({ employee }) => employee.id))] } },
                    transaction,
                }),
                this.workCalendarRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: {
                        id: {
                            $in: [...new Set(values.flatMap(({ workCalendar }) => (workCalendar ? [workCalendar] : [])))],
                        },
                    },
                    transaction,
                }),
                this.workScheduleRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: {
                        id: {
                            $in: [...new Set(values.flatMap(({ workSchedule }) => (workSchedule ? [workSchedule] : [])))],
                        },
                    },
                    transaction,
                }),
                this.leavePolicyRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: {
                        id: { $in: [...new Set(values.flatMap(({ leavePolicy }) => (leavePolicy ? [leavePolicy] : [])))] },
                    },
                    transaction,
                }),
            ]);

            const employeesById = new Map(employees.map((entity) => [entity.id, entity]));
            const calendarsById = new Map(calendars.map((entity) => [entity.id, entity]));
            const schedulesById = new Map(schedules.map((entity) => [entity.id, entity]));
            const policiesById = new Map(policies.map((entity) => [entity.id, entity]));

            for (const request of pending) {
                const employee = employeesById.get(request.employee.id)!;
                const input = request.payload;
                const workCalendar = input.workCalendar ? calendarsById.get(input.workCalendar) : employee.workCalendar;
                const workSchedule = input.workSchedule ? schedulesById.get(input.workSchedule) : employee.workSchedule;
                const leavePolicy = input.leavePolicy ? policiesById.get(input.leavePolicy) : employee.leavePolicy;
                const scheduleTimezone = input.scheduleTimezone ?? employee.scheduleTimezone;
                const contractEndsOn =
                    input.contractEndsOn === undefined ? employee.contractEndsOn : (input.contractEndsOn ?? undefined);

                try {
                    request.beginApplication();
                    if (!workCalendar || !workSchedule || !leavePolicy) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.TERMS_NOT_FOUND` });
                    } else {
                        this.employeeService.changeTerms({
                            input: {
                                scheduleAnchorDate:
                                    input.scheduleAnchorDate === undefined
                                        ? employee.scheduleAnchorDate
                                        : (input.scheduleAnchorDate ?? undefined),
                                contractType:
                                    input.contractType === undefined
                                        ? employee.contractType
                                        : (input.contractType ?? undefined),
                                termsValidFrom: input.termsValidFrom,
                                scheduleTimezone: scheduleTimezone!,
                                contractEndsOn,
                                workCalendar,
                                workSchedule,
                                leavePolicy,
                            },
                            entity: employee,
                            transaction,
                            request,
                        });
                        request.markApplied({ result: { termsRevision: employee.termsRevision, employee: employee.id } });
                    }
                } catch (error) {
                    if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                        throw error;
                    } else {
                        request.markFailed({ reason: error.message });
                    }
                }
            }
        }

        return requests;
    }

    public async transfer(props: Services.HRRequestExecution.Transfer.Props): Services.HRRequestExecution.Transfer.Result {
        const { transaction, identifiers } = props;
        const requests = (await this.hrRequestRepository.find({
            options: {
                populate: ["organization"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { effectiveAt: "ASC", createdAt: "ASC", id: "ASC" },
                strategy: "select-in",
                refresh: true,
            },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: new Date() } }, { effectiveAt: null }],
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.TRANSFER,
                id: { $in: identifiers },
            },
            transaction,
        })) as Entities.HRRequest<HRRequestType.TRANSFER>[];

        if (requests.length) {
            const employeeIds = [...new Set(requests.map(({ employee }) => employee.id))];
            const positionIds = [...new Set(requests.map(({ payload }) => payload.position))];
            const employees = await this.employeeRepository.find({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                where: { id: { $in: employeeIds } },
                transaction,
            });
            const positions = await this.positionRepository.find({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                where: { id: { $in: positionIds } },
                transaction,
            });
            const assignments = await this.positionAssignmentRepository.find({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                where: {
                    $or: [{ employee: { id: { $in: employeeIds } } }, { position: { id: { $in: positionIds } } }],
                    status: PositionAssignmentStatus.ACTIVE,
                },
                transaction,
            });
            const assignmentsByEmployee = new Map(assignments.map((entity) => [entity.employee.id, entity]));
            const assignmentsByPosition = new Map(assignments.map((entity) => [entity.position.id, entity]));
            const employeesById = new Map(employees.map((entity) => [entity.id, entity]));
            const positionsById = new Map(positions.map((entity) => [entity.id, entity]));
            const created: Entities.PositionAssignment[] = [];

            for (const request of requests) {
                const employee = employeesById.get(request.employee.id)!;
                const current = assignmentsByEmployee.get(employee.id);
                const position = positionsById.get(request.payload.position);

                try {
                    request.beginApplication();
                    if (!current || !position) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.PLACEMENT_NOT_FOUND` });
                    } else if (request.targetPosition && request.targetPosition.id !== position.id) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.POSITION_MISMATCH` });
                    } else if (assignmentsByPosition.has(position.id)) {
                        throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.POSITION_OCCUPIED` });
                    } else {
                        const assignment = new PositionAssignment({
                            placementSnapshot: {
                                department: position.department,
                                title: position.title,
                                grade: position.grade,
                                code: position.code,
                                team: position.team,
                            },
                            salaryCurrency: current.salaryCurrency,
                            sourceRequest: request,
                            positionTitle: position.title,
                            organization: request.organization,
                            salaryAmount: current.salaryAmount,
                            salaryPeriod: current.salaryPeriod,
                            department: position.department,
                            validFrom: request.payload.validFrom,
                            employee,
                            position,
                            status: PositionAssignmentStatus.ACTIVE,
                            grade: position.grade,
                            team: position.team,
                            fte: current.fte,
                        });
                        assignment.canCreate();
                        current.close({ validTo: request.payload.validFrom, request });
                        request.markApplied({
                            result: { assignment: assignment.id, employee: employee.id, position: position.id },
                        });
                        assignmentsByPosition.delete(current.position.id);
                        assignmentsByPosition.set(position.id, assignment);
                        assignmentsByEmployee.set(employee.id, assignment);
                        created.push(assignment);
                    }
                } catch (error) {
                    if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                        throw error;
                    } else {
                        request.markFailed({ reason: error.message });
                    }
                }
            }

            if (created.length) {
                await transaction.flush();
                transaction.persist(created);
            }
        }

        return requests;
    }

    public async beginLeave(
        props: Services.HRRequestExecution.BeginLeave.Props,
    ): Services.HRRequestExecution.BeginLeave.Result {
        const { transaction, identifiers } = props;
        const requests = (await this.hrRequestRepository.find({
            options: {
                populate: ["organization", "employee"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { id: "ASC" },
                strategy: "select-in",
                refresh: true,
            },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: new Date() } }, { effectiveAt: null }],
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.TERMINATE,
                id: { $in: identifiers },
            },
            transaction,
        })) as Entities.HRRequest<HRRequestType.TERMINATE>[];

        for (const request of requests) {
            request.beginApplication();
            const { employmentEndedOn } = request.payload;

            try {
                request.employee.canTerminate({ employmentEndedOn });
            } catch (error) {
                if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                    throw error;
                } else {
                    request.markFailed({ reason: error.message });
                }
            }
        }

        const unlinked = requests.filter(
            (request) => request.executionStatus === HRExecutionStatus.RUNNING && !request.employee.account,
        );

        if (unlinked.length) {
            const identifiers = [...new Set(unlinked.map(({ employee }) => employee.id))];
            const [employees, assignments] = await Promise.all([
                this.employeeRepository.find({
                    options: {
                        populate: ["workCalendar", "workSchedule", "leavePolicy"],
                        lockMode: LockMode.PESSIMISTIC_WRITE,
                        orderBy: { id: "ASC" },
                        strategy: "select-in",
                        refresh: true,
                    },
                    where: { id: { $in: identifiers } },
                    transaction,
                }),
                this.positionAssignmentRepository.find({
                    options: {
                        lockMode: LockMode.PESSIMISTIC_WRITE,
                        orderBy: { id: "ASC" },
                        refresh: true,
                    },
                    where: {
                        status: PositionAssignmentStatus.ACTIVE,
                        employee: { id: { $in: identifiers } },
                    },
                    transaction,
                }),
            ]);

            const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
            const assignmentsByEmployee = new Map<string, Entities.PositionAssignment[]>();

            for (const assignment of assignments) {
                const group = assignmentsByEmployee.get(assignment.employee.id) ?? [];
                group.push(assignment);
                assignmentsByEmployee.set(assignment.employee.id, group);
            }

            for (const request of unlinked) {
                this.employeeService.terminate({
                    assignments: assignmentsByEmployee.get(request.employee.id) ?? [],
                    input: {
                        employmentEndedOn: request.payload.employmentEndedOn,
                    },
                    entity: employeesById.get(request.employee.id)!,
                    transaction,
                    request,
                });
                request.markApplied({ result: { employee: request.employee.id } });
            }
        }

        return requests;
    }

    public async confirmLeave(
        props: Services.HRRequestExecution.ConfirmLeave.Props,
    ): Services.HRRequestExecution.ConfirmLeave.Result {
        const { transaction, input, realm } = props;
        const request = (await this.hrRequestRepository.findUnique({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            where: {
                organization: { id: input.organization, realm },
                employee: { account: input.account },
                type: HRRequestType.TERMINATE,
                id: input.process,
            },
            transaction,
        })) as Nullable<Entities.HRRequest<HRRequestType.TERMINATE>>;

        if (request?.executionStatus === HRExecutionStatus.RUNNING) {
            const [employee, assignments] = await Promise.all([
                this.employeeRepository.findUniqueOrThrow({
                    options: {
                        populate: ["workCalendar", "workSchedule", "leavePolicy"],
                        lockMode: LockMode.PESSIMISTIC_WRITE,
                        strategy: "select-in",
                        refresh: true,
                    },
                    where: { organization: input.organization, id: request.employee.id },
                    transaction,
                }),
                this.positionAssignmentRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                    where: {
                        status: PositionAssignmentStatus.ACTIVE,
                        employee: { id: request.employee.id },
                        organization: input.organization,
                    },
                    transaction,
                }),
            ]);

            this.employeeService.terminate({
                input: { employmentEndedOn: request.payload.employmentEndedOn },
                entity: employee,
                assignments,
                transaction,
                request,
            });
            request.markApplied({
                result: {
                    employee: request.employee.id,
                    account: input.account,
                },
            });
        }
    }

    public async rejectLeave(
        props: Services.HRRequestExecution.RejectLeave.Props,
    ): Services.HRRequestExecution.RejectLeave.Result {
        const { transaction, input, realm } = props;
        const request = await this.hrRequestRepository.findUnique({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            where: {
                organization: { id: input.organization, realm },
                employee: { account: input.account },
                type: HRRequestType.TERMINATE,
                id: input.process,
            },
            transaction,
        });

        if (request?.executionStatus === HRExecutionStatus.RUNNING) {
            request.markFailed({ reason: input.reason });
        }
    }

    public async cancel(props: Services.HRRequestExecution.Cancel.Props): Services.HRRequestExecution.Cancel.Result {
        const { transaction, organization, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.cancel();

        return requestEntity;
    }

    public async scheduleApplication(
        props: Services.HRRequestExecution.ScheduleApplication.Props,
    ): Services.HRRequestExecution.ScheduleApplication.Result {
        const { transaction, organization, input, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.scheduleApplication(input);

        return requestEntity;
    }

    public async beginApplication(
        props: Services.HRRequestExecution.BeginApplication.Props,
    ): Services.HRRequestExecution.BeginApplication.Result {
        const { transaction, organization, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.beginApplication();

        return requestEntity;
    }

    public async markApplied(
        props: Services.HRRequestExecution.MarkApplied.Props,
    ): Services.HRRequestExecution.MarkApplied.Result {
        const { transaction, organization, input, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.markApplied(input);

        return requestEntity;
    }

    public async markFailed(
        props: Services.HRRequestExecution.MarkFailed.Props,
    ): Services.HRRequestExecution.MarkFailed.Result {
        const { transaction, organization, input, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.markFailed(input);

        return requestEntity;
    }
    private leaveAmount(value: string): bigint {
        const [whole, fraction = ""] = value.replace("-", "").split(".");
        return (value.startsWith("-") ? -1n : 1n) * BigInt(whole + fraction.padEnd(6, "0"));
    }
}
