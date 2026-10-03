import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { PositionAssignmentStatus, EmployeeStatus } from "~context/enums";
import {
    POSITION_ASSIGNMENT_REPOSITORY,
    WORK_CALENDAR_REPOSITORY,
    WORK_SCHEDULE_REPOSITORY,
    LEAVE_POLICY_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    EMPLOYEE_REPOSITORY,
} from "~context/infrastructure/repositories";

import { EMPLOYMENT_SERVICE } from "./tokens";
import { Employee } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class EmployeeService implements Services.Employee.Contract {
    public constructor(
        @Inject(EMPLOYMENT_SERVICE)
        private readonly employmentService: Services.Employment.ServiceContract,
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

    public create(props: Services.Employee.Create.Props): Services.Employee.Create.Result {
        const { transaction, organization, input } = props;

        const entity = new Employee({
            ...input,
            organization,
            status: EmployeeStatus.DRAFT,
            termsRevision: 1,
        });

        entity.canCreate();

        transaction.persist(entity);

        return entity;
    }

    public async update(props: Services.Employee.Update.Props): Services.Employee.Update.Result {
        const { transaction, organization, patch, id } = props;
        const entity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.update({ patch });

        return entity;
    }

    public async linkAccount(props: Services.Employee.LinkAccount.Props): Services.Employee.LinkAccount.Result {
        const { transaction, organization, account, id } = props;
        const entity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.linkAccount({ account });

        return entity;
    }

    public async unlinkAccount(props: Services.Employee.UnlinkAccount.Props): Services.Employee.UnlinkAccount.Result {
        const { transaction, organization, id } = props;
        const entity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.unlinkAccount();

        return entity;
    }

    public async archive(props: Services.Employee.Archive.Props): Services.Employee.Archive.Result {
        const { transaction, organization, id } = props;
        const entity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.archive();

        return entity;
    }

    public async restore(props: Services.Employee.Restore.Props): Services.Employee.Restore.Result {
        const { transaction, organization, id } = props;
        const entity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.restore();

        return entity;
    }

    public async setHRBP(props: Services.Employee.SetHRBP.Props): Services.Employee.SetHRBP.Result {
        const { transaction, organization, id } = props;
        const [entity, employee] = await Promise.all([
            this.employeeRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                where: { organization, id },
                transaction,
            }),
            props.employee
                ? this.employeeRepository.findUniqueOrThrow({
                      where: { id: props.employee, organization },
                      transaction,
                  })
                : undefined,
        ]);

        if (employee) {
            entity.setHRBP({ employee });
        }

        return entity;
    }

    public async hire(props: Services.Employee.Hire.Props): Services.Employee.Hire.Result {
        const { transaction, organization, input, id } = props;

        const [entity, workCalendar, workSchedule, leavePolicy] = await Promise.all([
            this.employeeRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                where: { organization, id },
                transaction,
            }),
            this.workCalendarRepository.findUniqueOrThrow({
                where: { id: input.workCalendar, organization },
                transaction,
            }),
            this.workScheduleRepository.findUniqueOrThrow({
                where: { id: input.workSchedule, organization },
                transaction,
            }),
            this.leavePolicyRepository.findUniqueOrThrow({
                where: { id: input.leavePolicy, organization },
                transaction,
            }),
        ]);

        entity.hire({ ...input, workCalendar, workSchedule, leavePolicy });

        return entity;
    }

    public async changeTerms(props: Services.Employee.ChangeTerms.Props): Services.Employee.ChangeTerms.Result {
        const { transaction, organization, input, id } = props;

        const [entity, workCalendar, workSchedule, leavePolicy, replacedByRequest] = await Promise.all([
            this.employeeRepository.findUniqueOrThrow({
                where: { organization, id },
                transaction,
                options: {
                    populate: ["workCalendar", "workSchedule", "leavePolicy"],
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    strategy: "select-in",
                },
            }),
            this.workCalendarRepository.findUniqueOrThrow({
                where: { id: input.workCalendar, organization },
                transaction,
            }),
            this.workScheduleRepository.findUniqueOrThrow({
                where: { id: input.workSchedule, organization },
                transaction,
            }),
            this.leavePolicyRepository.findUniqueOrThrow({
                where: { id: input.leavePolicy, organization },
                transaction,
            }),
            props.request
                ? this.hrRequestRepository.findUniqueOrThrow({
                      where: {
                          id: props.request,
                          employee: { id },
                          organization,
                      },
                      transaction,
                  })
                : undefined,
        ]);

        const previous = {
            termsRevision: entity.termsRevision,
            validFrom: entity.termsValidFrom!,
            workCalendar: entity.workCalendar,
            workSchedule: entity.workSchedule,
            leavePolicy: entity.leavePolicy,
            validTo: input.termsValidFrom,
            replacedByRequest,
            employee: entity,
            organization,
            termsSnapshot: {
                employmentStartedOn: entity.employmentStartedOn,
                scheduleAnchorDate: entity.scheduleAnchorDate,
                employmentEndedOn: entity.employmentEndedOn,
                scheduleTimezone: entity.scheduleTimezone,
                contractEndsOn: entity.contractEndsOn,
                contractType: entity.contractType,
                status: entity.status,
            },
        };

        entity.changeTerms({ ...input, workCalendar, workSchedule, leavePolicy });

        this.employmentService.create({ input: previous, organization, transaction });

        return entity;
    }

    public async terminate(props: Services.Employee.Terminate.Props): Services.Employee.Terminate.Result {
        const { transaction, organization, input, id } = props;

        const [entity, assignments, replacedByRequest] = await Promise.all([
            this.employeeRepository.findUniqueOrThrow({
                where: { organization, id },
                transaction,
                options: {
                    populate: ["workCalendar", "workSchedule", "leavePolicy"],
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    strategy: "select-in",
                },
            }),
            this.positionAssignmentRepository.find({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                where: {
                    status: PositionAssignmentStatus.ACTIVE,
                    employee: { id },
                    organization,
                },
                transaction,
            }),
            props.request
                ? this.hrRequestRepository.findUniqueOrThrow({
                      where: {
                          id: props.request,
                          employee: { id },
                          organization,
                      },
                      transaction,
                  })
                : undefined,
        ]);

        const previous = {
            validTo: props.input.employmentEndedOn,
            termsRevision: entity.termsRevision,
            validFrom: entity.termsValidFrom!,
            workCalendar: entity.workCalendar,
            workSchedule: entity.workSchedule,
            leavePolicy: entity.leavePolicy,
            replacedByRequest,
            employee: entity,
            organization,
            termsSnapshot: {
                employmentStartedOn: entity.employmentStartedOn,
                scheduleAnchorDate: entity.scheduleAnchorDate,
                employmentEndedOn: entity.employmentEndedOn,
                scheduleTimezone: entity.scheduleTimezone,
                contractEndsOn: entity.contractEndsOn,
                contractType: entity.contractType,
                status: entity.status,
            },
        };

        entity.terminate(input);

        this.employmentService.create({
            input: previous,
            organization,
            transaction,
        });

        for (const assignment of assignments) {
            assignment.close({
                validTo: input.employmentEndedOn,
                request: replacedByRequest,
            });
        }

        return entity;
    }
}
