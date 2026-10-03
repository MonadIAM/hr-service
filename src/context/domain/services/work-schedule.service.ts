import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { WORK_SCHEDULE_REPOSITORY } from "~context/infrastructure/repositories";
import { Exception } from "~common/exceptions";
import { RecordStatus } from "~context/enums";

import { WorkSchedule } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class WorkScheduleService implements Services.WorkSchedule.Contract {
    private readonly dictionaryPath = "services.work-schedule";

    public constructor(
        @Inject(WORK_SCHEDULE_REPOSITORY)
        private readonly workScheduleRepository: Repositories.WorkSchedule.Contract,
    ) {}

    public create(props: Services.WorkSchedule.Create.Props): Services.WorkSchedule.Create.Result {
        const { transaction, organization, input } = props;

        const entity = new WorkSchedule({
            ...input,
            status: RecordStatus.ACTIVE,
            organization,
            revision: 1,
        });

        transaction.persist(entity);

        return entity;
    }

    public async createRevision(
        props: Services.WorkSchedule.CreateRevision.Props,
    ): Services.WorkSchedule.CreateRevision.Result {
        const { transaction, organization, input, id } = props;
        const entity = await this.workScheduleRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        const latest = await this.workScheduleRepository.find({
            options: {
                orderBy: { revision: "DESC" },
                fields: ["id"],
                limit: 1,
            },
            where: { code: entity.code, organization },
            transaction,
        });

        if (latest[0]?.id !== entity.id) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.STALE_REVISION` });
        }

        const revision = entity.createRevision(input);

        transaction.persist(revision);

        return revision;
    }

    public async archive(props: Services.WorkSchedule.Archive.Props): Services.WorkSchedule.Archive.Result {
        const { transaction, organization, id } = props;
        const entity = await this.workScheduleRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.archive();

        return entity;
    }

    public async restore(props: Services.WorkSchedule.Restore.Props): Services.WorkSchedule.Restore.Result {
        const { transaction, organization, id } = props;
        const entity = await this.workScheduleRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.restore();

        return entity;
    }

    public async purge(props: Services.WorkSchedule.Purge.Props): Services.WorkSchedule.Purge.Result {
        const { transaction, organization, id } = props;
        const entity = await this.workScheduleRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.canPurge();

        transaction.remove(entity);

        return entity;
    }
}
