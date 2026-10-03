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
        const { organization, input, actor } = props;

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
                    input: {
                        ...input,
                        initiatorAccount: actor,
                    },
                    transaction,
                    organization,
                });
            },
        });

        return { message: `${this.dictionaryPath}.CREATED` };
    }

    public async update(props: Commands.HRRequest.Update.Props): Commands.HRRequest.Update.Result {
        const { organization, input, id } = props;

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
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.UPDATED` };
    }

    public async submit(props: Commands.HRRequest.Submit.Props): Commands.HRRequest.Submit.Result {
        const { organization, input, id } = props;

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
                    transaction,
                    organization,
                    input,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.SUBMITTED` };
    }

    public async withdraw(props: Commands.HRRequest.Withdraw.Props): Commands.HRRequest.Withdraw.Result {
        const { organization, id } = props;

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
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.WITHDRAWN` };
    }
}
