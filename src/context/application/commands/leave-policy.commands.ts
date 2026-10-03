import { Injectable, Inject, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { LEAVE_POLICY_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class LeavePolicyCommands implements Commands.LeavePolicy.Contract {
    private readonly dictionaryPath = "commands.leave-policy";
    private readonly resource = "LeavePolicy";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(LEAVE_POLICY_SERVICE)
        private readonly leavePolicyService: Services.LeavePolicy.CommandContract,
    ) {}

    public async create(props: Commands.LeavePolicy.Create.Props): Commands.LeavePolicy.Create.Result {
        const { organization, input } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.LEAVE_POLICY,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                return this.leavePolicyService.create({
                    transaction,
                    organization,
                    input,
                });
            },
        });

        return { message: `${this.dictionaryPath}.CREATED` };
    }

    public async createRevision(
        props: Commands.LeavePolicy.CreateRevision.Props,
    ): Commands.LeavePolicy.CreateRevision.Result {
        const { organization, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.LEAVE_POLICY,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.leavePolicyService.createRevision({
                    transaction,
                    organization,
                    input,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.REVISION_CREATED` };
    }

    public async archive(props: Commands.LeavePolicy.Archive.Props): Commands.LeavePolicy.Archive.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.LEAVE_POLICY,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.leavePolicyService.archive({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.ARCHIVED` };
    }

    public async restore(props: Commands.LeavePolicy.Restore.Props): Commands.LeavePolicy.Restore.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.LEAVE_POLICY,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.leavePolicyService.restore({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.RESTORED` };
    }

    public async purge(props: Commands.LeavePolicy.Purge.Props): Commands.LeavePolicy.Purge.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.LEAVE_POLICY,
                actionType: ActionType.DELETE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.leavePolicyService.purge({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.PURGED` };
    }
}
