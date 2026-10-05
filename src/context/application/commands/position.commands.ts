import { Injectable, Inject, Scope } from "@nestjs/common";

import { ActionType, EntityType, KafkaTopic, PositionTopicAction } from "~context/enums";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { POSITION_SERVICE } from "~context/domain/services";
import { CONSUMER_META } from "~context/constants";
import { Exception } from "~common/exceptions";

import { PositionMapper } from "../mappers/position.mapper";

@Injectable({ scope: Scope.DEFAULT })
export class PositionCommands implements Commands.Position.Contract {
    private readonly mapper: Commands.Mappers.Position.Contract;
    private readonly dictionaryPath = "commands.position";
    private readonly resource = "Position";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(POSITION_SERVICE)
        private readonly positionService: Services.Position.CommandContract,
    ) {
        this.mapper = new PositionMapper();
    }

    public async create(props: Commands.Position.Create.Props): Commands.Position.Create.Result {
        const { organization, input, actor, realm } = props;

        await this.transactionalService.run({
            resource: this.resource,
            outbox: {
                payloadMapper: this.mapper.placementPayload,
                actionType: PositionTopicAction.PLACEMENT_REQUESTED,
                destinationTopic: KafkaTopic.POSITION,
            },
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                const position = await this.positionService.create({
                    transaction,
                    organization,
                    input,
                });
                return { position, actor, realm };
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
        const { organization, id, actor, realm } = props;

        await this.transactionalService.run({
            resource: this.resource,
            outbox: {
                payloadMapper: this.mapper.lifecyclePayload,
                actionType: PositionTopicAction.ARCHIVED,
                destinationTopic: KafkaTopic.POSITION,
            },
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                const position = await this.positionService.archive({
                    transaction,
                    organization,
                    id,
                });
                return { positions: [position], organization, actor, realm };
            },
        });

        return { message: `${this.dictionaryPath}.ARCHIVED` };
    }

    public async restore(props: Commands.Position.Restore.Props): Commands.Position.Restore.Result {
        const { organization, id, actor, realm } = props;

        await this.transactionalService.run({
            resource: this.resource,
            outbox: {
                payloadMapper: this.mapper.placementPayload,
                actionType: PositionTopicAction.PLACEMENT_REQUESTED,
                destinationTopic: KafkaTopic.POSITION,
            },
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                const position = await this.positionService.restore({
                    transaction,
                    organization,
                    id,
                });
                return { position, actor, realm };
            },
        });

        return { message: `${this.dictionaryPath}.RESTORED` };
    }

    public async purge(props: Commands.Position.Purge.Props): Commands.Position.Purge.Result {
        const { organization, id, actor, realm } = props;

        await this.transactionalService.run({
            resource: this.resource,
            outbox: {
                payloadMapper: this.mapper.lifecyclePayload,
                actionType: PositionTopicAction.PURGED,
                destinationTopic: KafkaTopic.POSITION,
            },
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.DELETE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                const position = await this.positionService.purge({
                    transaction,
                    organization,
                    id,
                });
                return { positions: [position], organization, actor, realm };
            },
        });

        return { message: `${this.dictionaryPath}.PURGED` };
    }

    public async validateReference(
        props: Commands.Position.ValidateReference.Props,
    ): Commands.Position.ValidateReference.Result {
        const { incoming, ...request } = props;

        try {
            await this.transactionalService.consume({
                incoming,
                resource: this.resource,
                outbox: {
                    payloadMapper: this.mapper.confirmed,
                    actionType: PositionTopicAction.REFERENCE_CONFIRMED,
                    destinationTopic: KafkaTopic.POSITION,
                },
                audit: {
                    entityType: EntityType.POSITION,
                    actionType: ActionType.UPDATE,
                    context: CONSUMER_META,
                    ...request,
                },
                changeLog: true,
                execute: async (transaction) => {
                    await this.positionService.validateReference({ ...request, transaction });
                    return { request };
                },
            });
        } catch (error) {
            if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                throw error;
            } else {
                await this.rejectReference({ incoming, request, reason: error.message });
            }
        }
    }

    public async rejectReference(props: Commands.Position.RejectReference.Props): Commands.Position.RejectReference.Result {
        const { incoming, ...result } = props;

        await this.transactionalService.consume({
            incoming,
            resource: this.resource,
            payload: this.mapper.rejected(result),
            actionType: PositionTopicAction.REFERENCE_REJECTED,
            destinationTopic: KafkaTopic.POSITION,
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.UPDATE,
                actor: result.request.actor,
                realm: result.request.realm,
                context: CONSUMER_META,
                input: result,
            },
        });
    }

    public async completePlacement(
        props: Commands.Position.CompletePlacement.Props,
    ): Commands.Position.CompletePlacement.Result {
        const { incoming, rejected, ...request } = props;

        await this.transactionalService.consume({
            incoming,
            resource: this.resource,
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.UPDATE,
                context: CONSUMER_META,
                ...request,
            },
            changeLog: true,
            execute: async (transaction) => {
                await this.positionService.completePlacement({ ...request, transaction, rejected });
            },
        });
    }

    public async purgeDepartment(props: Commands.Position.PurgeDepartment.Props): Commands.Position.PurgeDepartment.Result {
        const { incoming, ...request } = props;

        await this.transactionalService.consume({
            incoming,
            resource: this.resource,
            outbox: {
                payloadMapper: this.mapper.lifecyclePayload,
                actionType: PositionTopicAction.PURGED,
                destinationTopic: KafkaTopic.POSITION,
            },
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.UPDATE,
                context: CONSUMER_META,
                ...request,
            },
            changeLog: true,
            execute: async (transaction) => {
                const positions = await this.positionService.purgeDepartment({ ...request, transaction });
                return { positions, organization: request.input.organization, actor: request.actor, realm: request.realm };
            },
        });
    }

    public async purgeTeam(props: Commands.Position.PurgeTeam.Props): Commands.Position.PurgeTeam.Result {
        const { incoming, ...request } = props;

        await this.transactionalService.consume({
            incoming,
            resource: this.resource,
            outbox: {
                payloadMapper: this.mapper.lifecyclePayload,
                actionType: PositionTopicAction.PURGED,
                destinationTopic: KafkaTopic.POSITION,
            },
            audit: {
                entityType: EntityType.POSITION,
                actionType: ActionType.UPDATE,
                context: CONSUMER_META,
                ...request,
            },
            changeLog: true,
            execute: async (transaction) => {
                const positions = await this.positionService.purgeTeam({ ...request, transaction });
                return { positions, organization: request.input.organization, actor: request.actor, realm: request.realm };
            },
        });
    }
}
