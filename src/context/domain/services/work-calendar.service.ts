import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { HRExecutionStatus, HRRequestType, RecordStatus } from "~context/enums";
import { Exception } from "~common/exceptions";
import {
    WORK_CALENDAR_REPOSITORY,
    ORGANIZATION_REPOSITORY,
    HR_REQUEST_REPOSITORY,
} from "~context/infrastructure/repositories";

import { WorkCalendar } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class WorkCalendarService implements Services.WorkCalendar.Contract {
    private readonly dictionaryPath = "services.work-calendar";

    public constructor(
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
        @Inject(WORK_CALENDAR_REPOSITORY)
        private readonly workCalendarRepository: Repositories.WorkCalendar.Contract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
    ) {}

    public async create(props: Services.WorkCalendar.Create.Props): Services.WorkCalendar.Create.Result {
        const { transaction, organization, input } = props;

        const organizationEntity = await this.organizationRepository.findUniqueOrThrow({
            where: { realm: props.realm, id: organization },
            transaction,
        });

        const calendarEntity = new WorkCalendar({
            ...input,
            organization: organizationEntity,
            status: RecordStatus.ACTIVE,
        });

        transaction.persist(calendarEntity);

        return calendarEntity;
    }

    public async update(props: Services.WorkCalendar.Update.Props): Services.WorkCalendar.Update.Result {
        const { transaction, organization, patch, id } = props;
        const calendarEntity = await this.workCalendarRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization: { realm: props.realm, id: organization }, id },
            transaction,
        });

        const pending = await this.hrRequestRepository.findUnique({
            where: {
                type: { $in: [HRRequestType.HIRE, HRRequestType.REHIRE] },
                executionStatus: HRExecutionStatus.RUNNING,
                payload: { workCalendar: id },
                organization,
            },
            transaction,
        });

        if (pending) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.HIRE_PENDING` });
        }

        calendarEntity.update({ patch });

        return calendarEntity;
    }

    public async archive(props: Services.WorkCalendar.Archive.Props): Services.WorkCalendar.Archive.Result {
        const { transaction, organization, id } = props;
        const calendarEntity = await this.workCalendarRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization: { realm: props.realm, id: organization }, id },
            transaction,
        });

        const pending = await this.hrRequestRepository.findUnique({
            where: {
                type: { $in: [HRRequestType.HIRE, HRRequestType.REHIRE] },
                executionStatus: HRExecutionStatus.RUNNING,
                payload: { workCalendar: id },
                organization,
            },
            transaction,
        });

        if (pending) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.HIRE_PENDING` });
        }

        calendarEntity.archive();

        return calendarEntity;
    }

    public async restore(props: Services.WorkCalendar.Restore.Props): Services.WorkCalendar.Restore.Result {
        const { transaction, organization, id } = props;
        const calendarEntity = await this.workCalendarRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization: { realm: props.realm, id: organization }, id },
            transaction,
        });

        calendarEntity.restore();

        return calendarEntity;
    }

    public async purge(props: Services.WorkCalendar.Purge.Props): Services.WorkCalendar.Purge.Result {
        const { transaction, organization, id } = props;
        const calendarEntity = await this.workCalendarRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization: { realm: props.realm, id: organization }, id },
            transaction,
        });

        const pending = await this.hrRequestRepository.findUnique({
            where: {
                type: { $in: [HRRequestType.HIRE, HRRequestType.REHIRE] },
                executionStatus: HRExecutionStatus.RUNNING,
                payload: { workCalendar: id },
                organization,
            },
            transaction,
        });

        if (pending) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.HIRE_PENDING` });
        }

        calendarEntity.canPurge();

        transaction.remove(calendarEntity);

        return calendarEntity;
    }
}
