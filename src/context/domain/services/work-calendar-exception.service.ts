import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { WORK_CALENDAR_EXCEPTION_REPOSITORY, WORK_CALENDAR_REPOSITORY } from "~context/infrastructure/repositories";

import { WorkCalendarException } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class WorkCalendarExceptionService implements Services.WorkCalendarException.Contract {
    public constructor(
        @Inject(WORK_CALENDAR_EXCEPTION_REPOSITORY)
        private readonly workCalendarExceptionRepository: Repositories.WorkCalendarException.Contract,
        @Inject(WORK_CALENDAR_REPOSITORY)
        private readonly workCalendarRepository: Repositories.WorkCalendar.Contract,
    ) {}

    public async create(props: Services.WorkCalendarException.Create.Props): Services.WorkCalendarException.Create.Result {
        const { transaction, organization, input } = props;
        const calendar = await this.workCalendarRepository.findUniqueOrThrow({
            where: { id: input.calendar, organization },
            transaction,
        });

        const entity = new WorkCalendarException({
            ...input,
            organization,
            calendar,
        });

        entity.canCreate();

        transaction.persist(entity);

        return entity;
    }

    public async update(props: Services.WorkCalendarException.Update.Props): Services.WorkCalendarException.Update.Result {
        const { transaction, organization, patch, id } = props;
        const entity = await this.workCalendarExceptionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.update({ patch });

        return entity;
    }

    public async purge(props: Services.WorkCalendarException.Purge.Props): Services.WorkCalendarException.Purge.Result {
        const { transaction, organization, id } = props;
        const entity = await this.workCalendarExceptionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        transaction.remove(entity);

        return entity;
    }
}
