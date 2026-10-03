import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { WORK_CALENDAR_REPOSITORY } from "~context/infrastructure/repositories";
import { RecordStatus } from "~context/enums";

import { WorkCalendar } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class WorkCalendarService implements Services.WorkCalendar.Contract {
    public constructor(
        @Inject(WORK_CALENDAR_REPOSITORY)
        private readonly workCalendarRepository: Repositories.WorkCalendar.Contract,
    ) {}

    public create(props: Services.WorkCalendar.Create.Props): Services.WorkCalendar.Create.Result {
        const { transaction, organization, input } = props;

        const entity = new WorkCalendar({
            ...input,
            status: RecordStatus.ACTIVE,
            organization,
        });

        transaction.persist(entity);

        return entity;
    }

    public async update(props: Services.WorkCalendar.Update.Props): Services.WorkCalendar.Update.Result {
        const { transaction, organization, patch, id } = props;
        const entity = await this.workCalendarRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.update({ patch });

        return entity;
    }

    public async archive(props: Services.WorkCalendar.Archive.Props): Services.WorkCalendar.Archive.Result {
        const { transaction, organization, id } = props;
        const entity = await this.workCalendarRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.archive();

        return entity;
    }

    public async restore(props: Services.WorkCalendar.Restore.Props): Services.WorkCalendar.Restore.Result {
        const { transaction, organization, id } = props;
        const entity = await this.workCalendarRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.restore();

        return entity;
    }

    public async purge(props: Services.WorkCalendar.Purge.Props): Services.WorkCalendar.Purge.Result {
        const { transaction, organization, id } = props;
        const entity = await this.workCalendarRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.canPurge();

        transaction.remove(entity);

        return entity;
    }
}
