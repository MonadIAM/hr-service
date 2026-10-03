import { Injectable, Inject, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { WORK_CALENDAR_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class WorkCalendarCommands implements Commands.WorkCalendar.Contract {
    private readonly dictionaryPath = "commands.work-calendar";
    private readonly resource = "WorkCalendar";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(WORK_CALENDAR_SERVICE)
        private readonly workCalendarService: Services.WorkCalendar.CommandContract,
    ) {}

    public async create(props: Commands.WorkCalendar.Create.Props): Commands.WorkCalendar.Create.Result {
        const { organization, input } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_CALENDAR,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                return this.workCalendarService.create({
                    transaction,
                    organization,
                    input,
                });
            },
        });

        return { message: `${this.dictionaryPath}.CREATED` };
    }

    public async update(props: Commands.WorkCalendar.Update.Props): Commands.WorkCalendar.Update.Result {
        const { organization, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_CALENDAR,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workCalendarService.update({
                    patch: input.patch,
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.UPDATED` };
    }

    public async archive(props: Commands.WorkCalendar.Archive.Props): Commands.WorkCalendar.Archive.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_CALENDAR,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workCalendarService.archive({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.ARCHIVED` };
    }

    public async restore(props: Commands.WorkCalendar.Restore.Props): Commands.WorkCalendar.Restore.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_CALENDAR,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workCalendarService.restore({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.RESTORED` };
    }

    public async purge(props: Commands.WorkCalendar.Purge.Props): Commands.WorkCalendar.Purge.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_CALENDAR,
                actionType: ActionType.DELETE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workCalendarService.purge({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.PURGED` };
    }
}
