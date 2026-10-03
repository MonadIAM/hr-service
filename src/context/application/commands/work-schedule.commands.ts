import { Injectable, Inject, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { WORK_SCHEDULE_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class WorkScheduleCommands implements Commands.WorkSchedule.Contract {
    private readonly dictionaryPath = "commands.work-schedule";
    private readonly resource = "WorkSchedule";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(WORK_SCHEDULE_SERVICE)
        private readonly workScheduleService: Services.WorkSchedule.CommandContract,
    ) {}

    public async create(props: Commands.WorkSchedule.Create.Props): Commands.WorkSchedule.Create.Result {
        const { organization, input } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_SCHEDULE,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                return this.workScheduleService.create({
                    transaction,
                    organization,
                    input,
                });
            },
        });

        return { message: `${this.dictionaryPath}.CREATED` };
    }

    public async createRevision(
        props: Commands.WorkSchedule.CreateRevision.Props,
    ): Commands.WorkSchedule.CreateRevision.Result {
        const { organization, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_SCHEDULE,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workScheduleService.createRevision({
                    transaction,
                    organization,
                    input,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.REVISION_CREATED` };
    }

    public async archive(props: Commands.WorkSchedule.Archive.Props): Commands.WorkSchedule.Archive.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_SCHEDULE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workScheduleService.archive({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.ARCHIVED` };
    }

    public async restore(props: Commands.WorkSchedule.Restore.Props): Commands.WorkSchedule.Restore.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_SCHEDULE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workScheduleService.restore({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.RESTORED` };
    }

    public async purge(props: Commands.WorkSchedule.Purge.Props): Commands.WorkSchedule.Purge.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_SCHEDULE,
                actionType: ActionType.DELETE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workScheduleService.purge({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.PURGED` };
    }
}
