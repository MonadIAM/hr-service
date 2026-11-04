import { Injectable, Inject, Scope } from "@nestjs/common";

import { WORK_CALENDAR_EXCEPTION_SERVICE } from "~context/domain/services";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class WorkCalendarExceptionCommands implements Commands.WorkCalendarException.Contract {
    private readonly dictionaryPath = "commands.work-calendar-exception";
    private readonly resource = "WorkCalendarException";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(WORK_CALENDAR_EXCEPTION_SERVICE)
        private readonly workCalendarExceptionService: Services.WorkCalendarException.CommandContract,
    ) {}

    public async create(props: Commands.WorkCalendarException.Create.Props): Commands.WorkCalendarException.Create.Result {
        const { organization, input, realm } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_CALENDAR_EXCEPTION,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workCalendarExceptionService.create({
                    organization,
                    transaction,
                    realm,
                    input,
                });
            },
        });

        return { message: `${this.dictionaryPath}.CREATED` };
    }

    public async update(props: Commands.WorkCalendarException.Update.Props): Commands.WorkCalendarException.Update.Result {
        const { organization, input, realm, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_CALENDAR_EXCEPTION,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workCalendarExceptionService.update({
                    patch: input.patch,
                    organization,
                    transaction,
                    realm,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.UPDATED` };
    }

    public async purge(props: Commands.WorkCalendarException.Purge.Props): Commands.WorkCalendarException.Purge.Result {
        const { organization, realm, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.WORK_CALENDAR_EXCEPTION,
                actionType: ActionType.DELETE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.workCalendarExceptionService.purge({
                    organization,
                    transaction,
                    realm,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.PURGED` };
    }
}
