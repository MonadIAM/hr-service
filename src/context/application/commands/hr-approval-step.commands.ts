import { Injectable, Inject, Scope } from "@nestjs/common";

import { HRDecisionKind, ActionType, EntityType, NotificationTopicAction, KafkaTopic } from "~context/enums";
import { HR_APPROVAL_STEP_SERVICE } from "~context/domain/services";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";

import { HRRequestMapper } from "../mappers/hr-request.mapper";

@Injectable({ scope: Scope.DEFAULT })
export class HRApprovalStepCommands implements Commands.HRApprovalStep.Contract {
    private readonly mapper: Commands.Mappers.HRRequest.Contract;
    private readonly dictionaryPath = "commands.hr-approval-step";
    private readonly resource = "HRApprovalStep";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(HR_APPROVAL_STEP_SERVICE)
        private readonly hrApprovalStepService: Services.HRApprovalStep.CommandContract,
    ) {
        this.mapper = new HRRequestMapper();
    }

    public async reassign(props: Commands.HRApprovalStep.Reassign.Props): Commands.HRApprovalStep.Reassign.Result {
        const { organization, input, realm, actor, id } = props;

        await this.transactionalService.run<Commands.HRApprovalStep.Reassign.ExecuteResult>({
            resource: this.resource,
            outbox: [
                {
                    payloadMapper: this.mapper.cancellationPayload,
                    actionType: NotificationTopicAction.CANCEL,
                    destinationTopic: KafkaTopic.NOTIFICATION,
                },
                {
                    payloadMapper: this.mapper.approvalPayload,
                    actionType: NotificationTopicAction.CREATE,
                    destinationTopic: KafkaTopic.NOTIFICATION,
                },
            ],
            audit: {
                entityType: EntityType.HR_APPROVAL_STEP,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                const { step, previous } = await this.hrApprovalStepService.reassign({
                    employee: input.employee,
                    organization,
                    transaction,
                    realm,
                    id,
                });

                return { previousSteps: [previous], steps: [step], realm, actor, reassigned: true };
            },
        });

        return { message: `${this.dictionaryPath}.REASSIGNED` };
    }

    public async approve(props: Commands.HRApprovalStep.Approve.Props): Commands.HRApprovalStep.Approve.Result {
        const { organization, realm, input, actor, id } = props;

        await this.transactionalService.run<Commands.HRApprovalStep.Approve.ExecuteResult>({
            resource: this.resource,
            outbox: [
                {
                    payloadMapper: this.mapper.cancellationPayload,
                    actionType: NotificationTopicAction.CANCEL,
                    destinationTopic: KafkaTopic.NOTIFICATION,
                },
                {
                    payloadMapper: this.mapper.approvalPayload,
                    actionType: NotificationTopicAction.CREATE,
                    destinationTopic: KafkaTopic.NOTIFICATION,
                },
                {
                    payloadMapper: this.mapper.outcomePayload,
                    actionType: NotificationTopicAction.CREATE,
                    destinationTopic: KafkaTopic.NOTIFICATION,
                },
            ],
            audit: {
                entityType: EntityType.HR_APPROVAL_STEP,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                const { step, previous, steps } = await this.hrApprovalStepService.decide({
                    actorEmployee: input.actorEmployee,
                    decision: HRDecisionKind.APPROVE,
                    comment: input.comment,
                    actorAccount: actor,
                    organization,
                    transaction,
                    realm,
                    id,
                });

                return { previousSteps: [previous], requests: [step.request], steps, realm, actor };
            },
        });

        return { message: `${this.dictionaryPath}.APPROVED` };
    }

    public async reject(props: Commands.HRApprovalStep.Reject.Props): Commands.HRApprovalStep.Reject.Result {
        const { organization, realm, input, actor, id } = props;

        await this.transactionalService.run<Commands.HRApprovalStep.Reject.ExecuteResult>({
            resource: this.resource,
            outbox: [
                {
                    payloadMapper: this.mapper.cancellationPayload,
                    actionType: NotificationTopicAction.CANCEL,
                    destinationTopic: KafkaTopic.NOTIFICATION,
                },
                {
                    payloadMapper: this.mapper.outcomePayload,
                    actionType: NotificationTopicAction.CREATE,
                    destinationTopic: KafkaTopic.NOTIFICATION,
                },
            ],
            audit: {
                entityType: EntityType.HR_APPROVAL_STEP,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                const { step, previous } = await this.hrApprovalStepService.decide({
                    actorEmployee: input.actorEmployee,
                    decision: HRDecisionKind.REJECT,
                    comment: input.comment,
                    actorAccount: actor,
                    organization,
                    transaction,
                    realm,
                    id,
                });

                return { previousSteps: [previous], requests: [step.request], realm, actor };
            },
        });

        return { message: `${this.dictionaryPath}.REJECTED` };
    }

    public async returnForRevision(
        props: Commands.HRApprovalStep.ReturnForRevision.Props,
    ): Commands.HRApprovalStep.ReturnForRevision.Result {
        const { organization, realm, input, actor, id } = props;

        await this.transactionalService.run<Commands.HRApprovalStep.ReturnForRevision.ExecuteResult>({
            resource: this.resource,
            outbox: [
                {
                    payloadMapper: this.mapper.cancellationPayload,
                    actionType: NotificationTopicAction.CANCEL,
                    destinationTopic: KafkaTopic.NOTIFICATION,
                },
                {
                    payloadMapper: this.mapper.outcomePayload,
                    actionType: NotificationTopicAction.CREATE,
                    destinationTopic: KafkaTopic.NOTIFICATION,
                },
            ],
            audit: {
                entityType: EntityType.HR_APPROVAL_STEP,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                const { step, previous } = await this.hrApprovalStepService.decide({
                    actorEmployee: input.actorEmployee,
                    decision: HRDecisionKind.RETURN,
                    comment: input.comment,
                    actorAccount: actor,
                    organization,
                    transaction,
                    realm,
                    id,
                });

                return { previousSteps: [previous], requests: [step.request], realm, actor };
            },
        });

        return { message: `${this.dictionaryPath}.RETURNED` };
    }
}
