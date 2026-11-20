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
            const employeeIdentifiers = new Set<string>();
            const positionIdentifiers = new Set<string>();
            const calendarIdentifiers = new Set<string>();
            const scheduleIdentifiers = new Set<string>();
            const policyIdentifiers = new Set<string>();

            for (const { employee, payload } of requests) {
                employeeIdentifiers.add(employee.id);
                positionIdentifiers.add(payload.position);
                calendarIdentifiers.add(payload.workCalendar);
                scheduleIdentifiers.add(payload.workSchedule);
                policyIdentifiers.add(payload.leavePolicy);
            }

            const employeeIds = Array.from(employeeIdentifiers);
            const positionIds = Array.from(positionIdentifiers);

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
                    where: { id: { $in: Array.from(calendarIdentifiers) } },
                    transaction,
                }),
                this.workScheduleRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: { id: { $in: Array.from(scheduleIdentifiers) } },
                    transaction,
                }),
                this.leavePolicyRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: { id: { $in: Array.from(policyIdentifiers) } },
                    transaction,
                }),
            ]);

            const occupiedEmployees = new Set<string>();
            const occupiedPositions = new Set<string>();
            for (const assignment of assignments) {
                occupiedEmployees.add(assignment.employee.id);
                occupiedPositions.add(assignment.position.id);
            }
            const employeesById = new Map<string, Entities.Employee>();
            for (const entity of employees) {
                employeesById.set(entity.id, entity);
            }
            const positionsById = new Map<string, Entities.Position>();
            for (const entity of positions) {
                positionsById.set(entity.id, entity);
            }
            const calendarsById = new Map<string, Entities.WorkCalendar>();
            for (const entity of calendars) {
                calendarsById.set(entity.id, entity);
            }
            const schedulesById = new Map<string, Entities.WorkSchedule>();
            for (const entity of schedules) {
                schedulesById.set(entity.id, entity);
            }
            const policiesById = new Map<string, Entities.LeavePolicy>();
            for (const entity of policies) {
                policiesById.set(entity.id, entity);
            }

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
                    } else if (occupiedEmployees.has(employee.id) || occupiedPositions.has(position.id)) {
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
                        occupiedEmployees.add(employee.id);
                        occupiedPositions.add(position.id);
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
            return [request];
        } else {
            return [];
        }
    }

    public async cancelRequests(
        props: Services.HRRequestExecution.CancelRequests.Props,
    ): Services.HRRequestExecution.CancelRequests.Result {
        const { transaction, identifiers } = props;
        const requests = await this.hrRequestRepository.find({
            options: {
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { effectiveAt: "ASC", createdAt: "ASC", id: "ASC" },
                refresh: true,
            },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: new Date() } }, { effectiveAt: null }],
                type: HRRequestType.CANCEL_REQUEST,
                status: HRRequestStatus.APPROVED,
                id: { $in: identifiers },
            },
            transaction,
        });

        if (requests.length) {
            const targetIdentifiers = new Set<string>();
            for (const request of requests) {
                targetIdentifiers.add(request.relatedRequest!.id);
            }
            const targetIds = Array.from(targetIdentifiers);
            const targets = await this.hrRequestRepository.find({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                where: { id: { $in: targetIds } },
                transaction,
            });
            const targetsById = new Map<string, Entities.HRRequest>();
            for (const target of targets) {
                targetsById.set(target.id, target);
            }

            for (const request of requests) {
                const target = targetsById.get(request.relatedRequest!.id)!;
                try {
                    request.beginApplication();
                    target.cancel();
                    request.markApplied({ result: { cancelledRequest: target.id, employee: target.employee.id } });
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
            const employeeIdentifiers = new Set<string>();
            const uniqueDates = new Set<string>();
            let firstDate = requests[0].payload.date;
            let lastDate = firstDate;
            for (const { employee, payload } of requests) {
                employeeIdentifiers.add(employee.id);
                uniqueDates.add(payload.date);
                if (payload.date < firstDate) {
                    firstDate = payload.date;
                }
                if (payload.date > lastDate) {
                    lastDate = payload.date;
                }
            }
            const employeeIds = Array.from(employeeIdentifiers);
            const dates = Array.from(uniqueDates);
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
                        $or: [{ validTo: { $gt: firstDate } }, { validTo: null }],
                        validFrom: { $lte: lastDate },
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
            const employeesById = new Map<string, Entities.Employee>();
            for (const employee of employees) {
                employeesById.set(employee.id, employee);
            }
            const assignmentsByEmployee = new Map<string, Entities.PositionAssignment[]>();
            const recordedDays = new Set<string>();
            for (const request of recorded) {
                recordedDays.add(`${request.employee.id}/${(request.payload as Entities.HRRequest.Payload.Overtime).date}`);
            }
            for (const assignment of assignments) {
                const group = assignmentsByEmployee.get(assignment.employee.id);

                if (group) {
                    group.push(assignment);
                } else {
                    assignmentsByEmployee.set(assignment.employee.id, [assignment]);
                }
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
                        let matchingAssignment: Entities.PositionAssignment | undefined;
                        let assignmentCount = 0;
                        const candidates = assignmentsByEmployee.get(employee.id);
                        if (candidates) {
                            for (const assignment of candidates) {
                                if (assignment.validFrom <= date && (!assignment.validTo || date < assignment.validTo)) {
                                    matchingAssignment = assignment;
                                    assignmentCount += 1;
                                    if (assignmentCount === 2) {
                                        break;
                                    }
                                }
                            }
                        }

                        if (![EmployeeStatus.ACTIVE, EmployeeStatus.TERMINATED].includes(employee.status)) {
                            throw Exception.invariantViolation({
                                messageKey: `${this.dictionaryPath}.INVALID_EMPLOYEE_STATUS`,
                            });
                        } else if (employee.termsValidFrom && date < employee.termsValidFrom) {
                            throw Exception.invariantViolation({
                                messageKey: `${this.dictionaryPath}.OVERTIME_TERMS_MISMATCH`,
                            });
                        } else if (assignmentCount !== 1) {
                            throw Exception.invariantViolation({
                                messageKey: `${this.dictionaryPath}.PLACEMENT_NOT_FOUND`,
                            });
                        } else if (recordedDays.has(key)) {
                            throw Exception.invariantViolation({
                                messageKey: `${this.dictionaryPath}.OVERTIME_ALREADY_RECORDED`,
                            });
                        } else {
                            request.markApplied({ result: request.calculateOvertime({ assignment: matchingAssignment! }) });
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
            const employeeIdentifiers = new Set<string>();
            let earliest = Infinity;
            let latest = -Infinity;
            for (const { employee, payload } of requests) {
                employeeIdentifiers.add(employee.id);
                const start = Date.parse(payload.unit === LeaveUnit.DAY ? payload.startDate : payload.startsAt);
                const end = Date.parse(payload.unit === LeaveUnit.DAY ? payload.endDate : payload.endsAt);
                earliest = Math.min(earliest, start, end);
                latest = Math.max(latest, start, end);
            }
            const employeeIds = Array.from(employeeIdentifiers);
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

            const employeesById = new Map<string, Entities.Employee>();
            const calendarIdentifiers = new Set<string>();
            for (const employee of employees) {
                employeesById.set(employee.id, employee);
                if (employee.workCalendar) {
                    calendarIdentifiers.add(employee.workCalendar.id);
                }
            }
            const from = new Date(earliest - 86400000);
            const to = new Date(latest + 86400000);
            const fromDate = from.toISOString().slice(0, 10);
            const toDate = to.toISOString().slice(0, 10);

            const [exceptions, absences, balances] = await Promise.all([
                this.workCalendarExceptionRepository.find({
                    where: {
                        calendar: {
                            id: {
                                $in: Array.from(calendarIdentifiers),
                            },
                        },
                        date: { $gte: fromDate, $lte: toDate },
                    },
                    transaction,
                }),
                this.absenceRepository.find({
                    where: {
                        $or: [
                            {
                                startDate: { $lt: toDate },
                                endDate: { $gt: fromDate },
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

            const exceptionsByCalendar = new Map<string, Entities.WorkCalendarException[]>();
            for (const exception of exceptions) {
                const group = exceptionsByCalendar.get(exception.calendar.id);

                if (group) {
                    group.push(exception);
                } else {
                    exceptionsByCalendar.set(exception.calendar.id, [exception]);
                }
            }
            const periodsByEmployee = new Map<string, [Date, Date][]>();

            for (const absence of absences) {
                const periods = periodsByEmployee.get(absence.employee.id);

                if (periods) {
                    periods.push(absence.period());
                } else {
                    periodsByEmployee.set(absence.employee.id, [absence.period()]);
                }
            }

            const available = new Map<string, bigint>();
            for (const balance of balances) {
                available.set(
                    `${balance.employee}/${balance.poolCode}/${balance.unit}`,
                    this.leaveAmount(balance.available),
                );
            }

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
                            exceptions: exceptionsByCalendar.get(workCalendar.id) ?? [],
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
            const employeeIdentifiers = new Set<string>();
            const policyIdentifiers = new Set<string>();
            for (const { employee, payload } of requests) {
                employeeIdentifiers.add(employee.id);
                policyIdentifiers.add(payload.leavePolicy);
            }
            const [employees, policies] = await Promise.all([
                this.employeeRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                    where: { id: { $in: Array.from(employeeIdentifiers) } },
                    transaction,
                }),
                this.leavePolicyRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                    where: { id: { $in: Array.from(policyIdentifiers) } },
                    transaction,
                }),
            ]);

            const employeesById = new Map<string, Entities.Employee>();
            for (const entity of employees) {
                employeesById.set(entity.id, entity);
            }
            const policiesById = new Map<string, Entities.LeavePolicy>();
            for (const entity of policies) {
                policiesById.set(entity.id, entity);
            }

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
            const employeeIdentifiers = new Set<string>();
            const calendarIdentifiers = new Set<string>();
            const scheduleIdentifiers = new Set<string>();
            const policyIdentifiers = new Set<string>();
            for (const { employee, payload } of pending) {
                employeeIdentifiers.add(employee.id);
                if (payload.workCalendar) {
                    calendarIdentifiers.add(payload.workCalendar);
                }
                if (payload.workSchedule) {
                    scheduleIdentifiers.add(payload.workSchedule);
                }
                if (payload.leavePolicy) {
                    policyIdentifiers.add(payload.leavePolicy);
                }
            }
            const [employees, calendars, schedules, policies] = await Promise.all([
                this.employeeRepository.find({
                    options: {
                        populate: ["workCalendar", "workSchedule", "leavePolicy"],
                        lockMode: LockMode.PESSIMISTIC_WRITE,
                        orderBy: { id: "ASC" },
                        strategy: "select-in",
                        refresh: true,
                    },
                    where: { id: { $in: Array.from(employeeIdentifiers) } },
                    transaction,
                }),
                calendarIdentifiers.size
                    ? this.workCalendarRepository.find({
                          options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                          where: { id: { $in: Array.from(calendarIdentifiers) } },
                          transaction,
                      })
                    : [],
                scheduleIdentifiers.size
                    ? this.workScheduleRepository.find({
                          options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                          where: { id: { $in: Array.from(scheduleIdentifiers) } },
                          transaction,
                      })
                    : [],
                policyIdentifiers.size
                    ? this.leavePolicyRepository.find({
                          options: { lockMode: LockMode.PESSIMISTIC_READ, orderBy: { id: "ASC" }, refresh: true },
                          where: { id: { $in: Array.from(policyIdentifiers) } },
                          transaction,
                      })
                    : [],
            ]);

            const employeesById = new Map<string, Entities.Employee>();
            for (const entity of employees) {
                employeesById.set(entity.id, entity);
            }
            const calendarsById = new Map<string, Entities.WorkCalendar>();
            for (const entity of calendars) {
                calendarsById.set(entity.id, entity);
            }
            const schedulesById = new Map<string, Entities.WorkSchedule>();
            for (const entity of schedules) {
                schedulesById.set(entity.id, entity);
            }
            const policiesById = new Map<string, Entities.LeavePolicy>();
            for (const entity of policies) {
                policiesById.set(entity.id, entity);
            }

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
            const employeeIdentifiers = new Set<string>();
            const positionIdentifiers = new Set<string>();
            for (const { employee, payload } of requests) {
                employeeIdentifiers.add(employee.id);
                positionIdentifiers.add(payload.position);
            }
            const employeeIds = Array.from(employeeIdentifiers);
            const positionIds = Array.from(positionIdentifiers);
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
            const assignmentsByEmployee = new Map<string, Entities.PositionAssignment>();
            const occupiedPositions = new Set<string>();
            for (const assignment of assignments) {
                assignmentsByEmployee.set(assignment.employee.id, assignment);
                occupiedPositions.add(assignment.position.id);
            }
            const employeesById = new Map<string, Entities.Employee>();
            for (const entity of employees) {
                employeesById.set(entity.id, entity);
            }
            const positionsById = new Map<string, Entities.Position>();
            for (const entity of positions) {
                positionsById.set(entity.id, entity);
            }
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
                    } else if (occupiedPositions.has(position.id)) {
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
                        occupiedPositions.delete(current.position.id);
                        occupiedPositions.add(position.id);
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

        const unlinked: Entities.HRRequest<HRRequestType.TERMINATE>[] = [];
        const employeeIdentifiers = new Set<string>();
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
            if (request.executionStatus === HRExecutionStatus.RUNNING && !request.employee.account) {
                unlinked.push(request);
                employeeIdentifiers.add(request.employee.id);
            }
        }

        if (unlinked.length) {
            const identifiers = Array.from(employeeIdentifiers);
            const employees = await this.employeeRepository.find({
                options: {
                    populate: ["workCalendar", "workSchedule", "leavePolicy"],
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    orderBy: { id: "ASC" },
                    strategy: "select-in",
                    refresh: true,
                },
                where: { id: { $in: identifiers } },
                transaction,
            });
            const assignments = await this.positionAssignmentRepository.find({
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
            });

            const employeesById = new Map<string, Entities.Employee>();
            for (const employee of employees) {
                employeesById.set(employee.id, employee);
            }
            const assignmentsByEmployee = new Map<string, Entities.PositionAssignment[]>();

            for (const assignment of assignments) {
                const group = assignmentsByEmployee.get(assignment.employee.id);

                if (group) {
                    group.push(assignment);
                } else {
                    assignmentsByEmployee.set(assignment.employee.id, [assignment]);
                }
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
            const employee = await this.employeeRepository.findUniqueOrThrow({
                options: {
                    populate: ["workCalendar", "workSchedule", "leavePolicy"],
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    strategy: "select-in",
                    refresh: true,
                },
                where: { organization: input.organization, id: request.employee.id },
                transaction,
            });
            const assignments = await this.positionAssignmentRepository.find({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                where: {
                    status: PositionAssignmentStatus.ACTIVE,
                    employee: { id: request.employee.id },
                    organization: input.organization,
                },
                transaction,
            });

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
            return [request];
        } else {
            return [];
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
            return [request];
        } else {
            return [];
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
