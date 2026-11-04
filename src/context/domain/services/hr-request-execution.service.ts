import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { PositionAssignmentStatus, HRExecutionStatus, HRRequestStatus, HRRequestType } from "~context/enums";
import { Exception } from "~common/exceptions";
import {
    POSITION_ASSIGNMENT_REPOSITORY,
    WORK_CALENDAR_REPOSITORY,
    WORK_SCHEDULE_REPOSITORY,
    LEAVE_POLICY_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    EMPLOYEE_REPOSITORY,
} from "~context/infrastructure/repositories";

import { EMPLOYEE_SERVICE } from "./tokens";

@Injectable({ scope: Scope.DEFAULT })
export class HRRequestExecutionService implements Services.HRRequestExecution.Contract {
    private readonly dictionaryPath = "services.hr-request-execution";

    public constructor(
        @Inject(EMPLOYEE_SERVICE)
        private readonly employeeService: Services.Employee.ProcessorContract,
        @Inject(POSITION_ASSIGNMENT_REPOSITORY)
        private readonly positionAssignmentRepository: Repositories.PositionAssignment.Contract,
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
    ) {}

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
}
