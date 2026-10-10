import { Injectable, Inject, Scope } from "@nestjs/common";

import { ActionType, EntityType, KafkaTopic, RealmTopicAction } from "~context/enums";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { ORGANIZATION_SERVICE } from "~context/domain/services";
import { CONSUMER_META } from "~context/constants";
import { Exception } from "~common/exceptions";

import { OrganizationMapper } from "../mappers/organization.mapper";

@Injectable({ scope: Scope.DEFAULT })
export class OrganizationCommands implements Commands.Organization.Contract {
    private readonly mapper: Commands.Mappers.Organization.Contract;
    private readonly resource = "Organization";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(ORGANIZATION_SERVICE)
        private readonly organizationService: Services.Organization.CommandContract,
    ) {
        this.mapper = new OrganizationMapper();
    }

    public async bootstrap(props: Commands.Organization.Bootstrap.Props): Commands.Organization.Bootstrap.Result {
        const { incoming, ...request } = props;

        try {
            await this.transactionalService.consume({
                incoming,
                resource: this.resource,
                outbox: {
                    payloadMapper: this.mapper.confirmed,
                    actionType: RealmTopicAction.BOOTSTRAP_CONFIRMED,
                    destinationTopic: KafkaTopic.REALM,
                },
                audit: {
                    entityType: EntityType.ORGANIZATION,
                    actionType: ActionType.CREATE,
                    context: CONSUMER_META,
                    ...request,
                },
                changeLog: true,
                execute: async (transaction) => {
                    await this.organizationService.bootstrap({ ...request, transaction });

                    return { request };
                },
            });
        } catch (error) {
            if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                throw error;
            } else {
                await this.rejectBootstrap({
                    reason: error instanceof Error ? error.message : String(error),
                    incoming,
                    request,
                });
            }
        }
    }

    public async rejectBootstrap(
        props: Commands.Organization.RejectBootstrap.Props,
    ): Commands.Organization.RejectBootstrap.Result {
        const { incoming, request } = props;

        await this.transactionalService.consume({
            incoming,
            resource: this.resource,
            payload: this.mapper.rejected(props),
            actionType: RealmTopicAction.BOOTSTRAP_REJECTED,
            destinationTopic: KafkaTopic.REALM,
            audit: {
                input: { ...request.input, reason: props.reason },
                entityType: EntityType.ORGANIZATION,
                actionType: ActionType.CREATE,
                context: CONSUMER_META,
                actor: request.actor,
                realm: request.realm,
            },
        });
    }

    public async purge(props: Commands.Organization.Purge.Props): Commands.Organization.Purge.Result {
        const { incoming, actor, realm } = props;

        await this.transactionalService.consume({
            incoming,
            resource: this.resource,
            audit: {
                entityType: EntityType.ORGANIZATION,
                actionType: ActionType.DELETE,
                context: CONSUMER_META,
                input: { realm },
                actor,
                realm,
            },
            changeLog: true,
            execute: (transaction) => {
                return this.organizationService.purge({ transaction, realm });
            },
        });
    }
}
