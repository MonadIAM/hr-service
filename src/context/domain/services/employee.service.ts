import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { PositionAssignmentStatus, EmployeeStatus } from "~context/enums";
import {
    POSITION_ASSIGNMENT_REPOSITORY,
    WORK_CALENDAR_REPOSITORY,
    WORK_SCHEDULE_REPOSITORY,
    LEAVE_POLICY_REPOSITORY,
    ORGANIZATION_REPOSITORY,
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
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
        @Inject(LEAVE_POLICY_REPOSITORY)
        private readonly leavePolicyRepository: Repositories.LeavePolicy.Contract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: Repositories.Employee.Contract,
    ) {}

    public async create(props: Services.Employee.Create.Props): Services.Employee.Create.Result {
        const { transaction, input } = props;

        const organizationEntity = await this.organizationRepository.findUniqueOrThrow({
            where: { id: props.organization },
            transaction,
        });

        const employeeEntity = new Employee({
            status: EmployeeStatus.DRAFT,
            termsRevision: 1,
            organization: organizationEntity,
            ...input,
        });

        employeeEntity.canCreate();

        transaction.persist(employeeEntity);

        return employeeEntity;
    }

    public async update(props: Services.Employee.Update.Props): Services.Employee.Update.Result {
        const { transaction, organization, patch, id } = props;
        const employeeEntity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        employeeEntity.update({ patch });

        return employeeEntity;
    }

    public async linkAccount(props: Services.Employee.LinkAccount.Props): Services.Employee.LinkAccount.Result {
        const { transaction, organization, account, id } = props;
        const employeeEntity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        employeeEntity.linkAccount({ account });

        return employeeEntity;
    }

    public async unlinkAccount(props: Services.Employee.UnlinkAccount.Props): Services.Employee.UnlinkAccount.Result {
        const { transaction, organization, id } = props;
        const employeeEntity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        employeeEntity.unlinkAccount();

        return employeeEntity;
    }

    public async archive(props: Services.Employee.Archive.Props): Services.Employee.Archive.Result {
        const { transaction, organization, id } = props;
        const employeeEntity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        employeeEntity.archive();

        return employeeEntity;
    }

    public async restore(props: Services.Employee.Restore.Props): Services.Employee.Restore.Result {
        const { transaction, organization, id } = props;
        const employeeEntity = await this.employeeRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        employeeEntity.restore();

        return employeeEntity;
    }

    public async setHRBP(props: Services.Employee.SetHRBP.Props): Services.Employee.SetHRBP.Result {
        const { transaction, organization, id } = props;
        const [employeeEntity, hrBpEmployeeEntity] = await Promise.all([
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

        if (hrBpEmployeeEntity) {
            employeeEntity.setHRBP({ employee: hrBpEmployeeEntity });
        }

        return employeeEntity;
    }

    public async hire(props: Services.Employee.Hire.Props): Services.Employee.Hire.Result {
        const { transaction, organization, input, id } = props;

        const [employeeEntity, workCalendarEntity, workScheduleEntity, leavePolicyEntity] = await Promise.all([
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

        employeeEntity.hire({
            ...input,
            workCalendar: workCalendarEntity,
            workSchedule: workScheduleEntity,
            leavePolicy: leavePolicyEntity,
        });

        return employeeEntity;
    }

    public async changeTerms(props: Services.Employee.ChangeTerms.Props): Services.Employee.ChangeTerms.Result {
        const { transaction, organization, input, id } = props;

        const [
            organizationEntity,
            employeeEntity,
            workCalendarEntity,
            workScheduleEntity,
            leavePolicyEntity,
            replacedByRequestEntity,
        ] = await Promise.all([
            this.organizationRepository.findUniqueOrThrow({
                where: { id: organization },
                transaction,
            }),
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
            termsRevision: employeeEntity.termsRevision,
            replacedByRequest: replacedByRequestEntity,
            workCalendar: employeeEntity.workCalendar,
            workSchedule: employeeEntity.workSchedule,
            validFrom: employeeEntity.termsValidFrom!,
            leavePolicy: employeeEntity.leavePolicy,
            validTo: input.termsValidFrom,
            employee: employeeEntity,
            termsSnapshot: {
                employmentStartedOn: employeeEntity.employmentStartedOn,
                scheduleAnchorDate: employeeEntity.scheduleAnchorDate,
                employmentEndedOn: employeeEntity.employmentEndedOn,
                scheduleTimezone: employeeEntity.scheduleTimezone,
                contractEndsOn: employeeEntity.contractEndsOn,
                contractType: employeeEntity.contractType,
                status: employeeEntity.status,
            },
        };

        employeeEntity.changeTerms({
            ...input,
            workCalendar: workCalendarEntity,
            workSchedule: workScheduleEntity,
            leavePolicy: leavePolicyEntity,
        });

        this.employmentService.create({
            organization: organizationEntity,
            input: previous,
            transaction,
        });

        return employeeEntity;
    }

    public async terminate(props: Services.Employee.Terminate.Props): Services.Employee.Terminate.Result {
        const { transaction, organization, input, id } = props;

        const [organizationEntity, employeeEntity, assignmentEntities, replacedByRequestEntity] = await Promise.all([
            this.organizationRepository.findUniqueOrThrow({
                where: { id: organization },
                transaction,
            }),
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
            termsRevision: employeeEntity.termsRevision,
            replacedByRequest: replacedByRequestEntity,
            workCalendar: employeeEntity.workCalendar,
            workSchedule: employeeEntity.workSchedule,
            validFrom: employeeEntity.termsValidFrom!,
            leavePolicy: employeeEntity.leavePolicy,
            validTo: props.input.employmentEndedOn,
            employee: employeeEntity,
            termsSnapshot: {
                employmentStartedOn: employeeEntity.employmentStartedOn,
                scheduleAnchorDate: employeeEntity.scheduleAnchorDate,
                employmentEndedOn: employeeEntity.employmentEndedOn,
                scheduleTimezone: employeeEntity.scheduleTimezone,
                contractEndsOn: employeeEntity.contractEndsOn,
                contractType: employeeEntity.contractType,
                status: employeeEntity.status,
            },
        };

        employeeEntity.terminate(input);

        this.employmentService.create({
            organization: organizationEntity,
            input: previous,
            transaction,
        });

        for (const assignmentEntity of assignmentEntities) {
            assignmentEntity.close({
                validTo: input.employmentEndedOn,
                request: replacedByRequestEntity,
            });
        }

        return employeeEntity;
    }
}
