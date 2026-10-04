import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { WORK_SCHEDULE_REPOSITORY, ORGANIZATION_REPOSITORY } from "~context/infrastructure/repositories";
import { Exception } from "~common/exceptions";
import { RecordStatus } from "~context/enums";

import { WorkSchedule } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class WorkScheduleService implements Services.WorkSchedule.Contract {
    private readonly dictionaryPath = "services.work-schedule";

    public constructor(
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
        @Inject(WORK_SCHEDULE_REPOSITORY)
        private readonly workScheduleRepository: Repositories.WorkSchedule.Contract,
    ) {}

    public async create(props: Services.WorkSchedule.Create.Props): Services.WorkSchedule.Create.Result {
        const { transaction, organization, input } = props;

        const organizationEntity = await this.organizationRepository.findUniqueOrThrow({
            where: { id: organization },
            transaction,
        });

        const scheduleEntity = new WorkSchedule({
            organization: organizationEntity,
            status: RecordStatus.ACTIVE,
            revision: 1,
            ...input,
        });

        transaction.persist(scheduleEntity);

        return scheduleEntity;
    }

    public async createRevision(
        props: Services.WorkSchedule.CreateRevision.Props,
    ): Services.WorkSchedule.CreateRevision.Result {
        const { transaction, organization, input, id } = props;
        const scheduleEntity = await this.workScheduleRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        const latestRevisionEntities = await this.workScheduleRepository.find({
            options: {
                orderBy: { revision: "DESC" },
                fields: ["id"],
                limit: 1,
            },
            where: { code: scheduleEntity.code, organization },
            transaction,
        });

        if (latestRevisionEntities[0]?.id !== scheduleEntity.id) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.STALE_REVISION` });
        }

        const revisionEntity = scheduleEntity.createRevision(input);

        transaction.persist(revisionEntity);

        return revisionEntity;
    }

    public async archive(props: Services.WorkSchedule.Archive.Props): Services.WorkSchedule.Archive.Result {
        const { transaction, organization, id } = props;
        const scheduleEntity = await this.workScheduleRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        scheduleEntity.archive();

        return scheduleEntity;
    }

    public async restore(props: Services.WorkSchedule.Restore.Props): Services.WorkSchedule.Restore.Result {
        const { transaction, organization, id } = props;
        const scheduleEntity = await this.workScheduleRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        scheduleEntity.restore();

        return scheduleEntity;
    }

    public async purge(props: Services.WorkSchedule.Purge.Props): Services.WorkSchedule.Purge.Result {
        const { transaction, organization, id } = props;
        const scheduleEntity = await this.workScheduleRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        scheduleEntity.canPurge();

        transaction.remove(scheduleEntity);

        return scheduleEntity;
    }
}
