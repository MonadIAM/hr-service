import { Injectable, Inject, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { HR_REQUEST_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class HRRequestCommands implements Commands.HRRequest.Contract {
    private readonly dictionaryPath = "commands.hr-request";
    private readonly resource = "HRRequest";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(HR_REQUEST_SERVICE)
        private readonly hrRequestService: Services.HRRequest.CommandContract,
    ) {}

    public async create(props: Commands.HRRequest.Create.Props): Commands.HRRequest.Create.Result {
        const { organization, permissions, realm, actor, input } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrRequestService.create({
                    organization,
                    permissions,
                    transaction,
                    input,
                    realm,
                    actor,
                });
            },
        });

        return { message: `${this.dictionaryPath}.CREATED` };
    }

    public async update(props: Commands.HRRequest.Update.Props): Commands.HRRequest.Update.Result {
        const { organization, permissions, actor, realm, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrRequestService.update({
                    patch: input.patch,
                    organization,
                    permissions,
                    transaction,
                    actor,
                    realm,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.UPDATED` };
    }

    public async submit(props: Commands.HRRequest.Submit.Props): Commands.HRRequest.Submit.Result {
        const { organization, permissions, actor, realm, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrRequestService.submit({
                    organization,
                    permissions,
                    transaction,
                    actor,
                    realm,
                    input,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.SUBMITTED` };
    }

    public async withdraw(props: Commands.HRRequest.Withdraw.Props): Commands.HRRequest.Withdraw.Result {
        const { organization, permissions, actor, realm, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrRequestService.withdraw({
                    organization,
                    permissions,
                    transaction,
                    realm,
                    actor,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.WITHDRAWN` };
    }
}
