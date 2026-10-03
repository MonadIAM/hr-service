import { Injectable, Inject, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { POSITION_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class PositionCommands implements Commands.Position.Contract {
    private readonly dictionaryPath = "commands.position";
    private readonly resource = "Position";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(POSITION_SERVICE)
        private readonly positionService: Services.Position.CommandContract,
    ) {}

    public async create(props: Commands.Position.Create.Props): Commands.Position.Create.Result {
        const { organization, input } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                return this.positionService.create({
                    transaction,
                    organization,
                    input,
                });
            },
        });

        return { message: `${this.dictionaryPath}.CREATED` };
    }

    public async update(props: Commands.Position.Update.Props): Commands.Position.Update.Result {
        const { organization, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.positionService.update({
                    patch: input.patch,
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.UPDATED` };
    }

    public async archive(props: Commands.Position.Archive.Props): Commands.Position.Archive.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.positionService.archive({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.ARCHIVED` };
    }

    public async restore(props: Commands.Position.Restore.Props): Commands.Position.Restore.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.positionService.restore({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.RESTORED` };
    }

    public async purge(props: Commands.Position.Purge.Props): Commands.Position.Purge.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.DELETE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.positionService.purge({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.PURGED` };
    }
}
