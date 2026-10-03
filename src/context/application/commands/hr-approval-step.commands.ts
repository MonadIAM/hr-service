import { Injectable, Inject, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { HR_APPROVAL_STEP_SERVICE } from "~context/domain/services";
import { HRDecisionKind, ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class HRApprovalStepCommands implements Commands.HRApprovalStep.Contract {
    private readonly dictionaryPath = "commands.hr-approval-step";
    private readonly resource = "HRApprovalStep";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(HR_APPROVAL_STEP_SERVICE)
        private readonly hrApprovalStepService: Services.HRApprovalStep.CommandContract,
    ) {}

    public async reassign(props: Commands.HRApprovalStep.Reassign.Props): Commands.HRApprovalStep.Reassign.Result {
        const { organization, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_APPROVAL_STEP,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrApprovalStepService.reassign({
                    employee: input.employee,
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.REASSIGNED` };
    }

    public async approve(props: Commands.HRApprovalStep.Approve.Props): Commands.HRApprovalStep.Approve.Result {
        const { organization, input, actor, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_APPROVAL_STEP,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrApprovalStepService.decide({
                    actorEmployee: input.actorEmployee,
                    decision: HRDecisionKind.APPROVE,
                    actorAccount: actor,
                    comment: input.comment,
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.APPROVED` };
    }

    public async reject(props: Commands.HRApprovalStep.Reject.Props): Commands.HRApprovalStep.Reject.Result {
        const { organization, input, actor, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_APPROVAL_STEP,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrApprovalStepService.decide({
                    actorEmployee: input.actorEmployee,
                    decision: HRDecisionKind.REJECT,
                    actorAccount: actor,
                    comment: input.comment,
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.REJECTED` };
    }

    public async returnForRevision(
        props: Commands.HRApprovalStep.ReturnForRevision.Props,
    ): Commands.HRApprovalStep.ReturnForRevision.Result {
        const { organization, input, actor, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_APPROVAL_STEP,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrApprovalStepService.decide({
                    actorEmployee: input.actorEmployee,
                    decision: HRDecisionKind.RETURN,
                    actorAccount: actor,
                    comment: input.comment,
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.RETURNED` };
    }
}
