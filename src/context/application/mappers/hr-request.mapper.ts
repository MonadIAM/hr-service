import {
    NotificationContentKind,
    NotificationCategory,
    HRExecutionStatus,
    HRApprovalStatus,
    PlatformService,
    MessageTemplate,
    HRRequestStatus,
    HRRequestType,
} from "~context/enums";

export class HRRequestMapper implements Commands.Mappers.HRRequest.Contract {
    public hirePayload(props: Commands.Mappers.HRRequest.HirePayload.Props): Commands.Mappers.HRRequest.HirePayload.Result {
        return props.requests
            .filter(
                (request) =>
                    [HRRequestType.HIRE, HRRequestType.REHIRE].includes(request.type) &&
                    request.employee.account &&
                    request.executionStatus === HRExecutionStatus.RUNNING,
            )
            .map((request) => ({
                actor: request.initiatorAccount,
                realm: request.organization.realm,
                input: {
                    organization: request.organization.id,
                    account: request.employee.account!,
                    process: request.id,
                },
            }));
    }

    public leavePayload(
        props: Commands.Mappers.HRRequest.LeavePayload.Props,
    ): Commands.Mappers.HRRequest.LeavePayload.Result {
        return props.requests
            .filter(
                (request) =>
                    request.type === HRRequestType.TERMINATE &&
                    request.employee.account &&
                    request.executionStatus === HRExecutionStatus.RUNNING,
            )
            .map((request) => ({
                actor: request.initiatorAccount,
                realm: request.organization.realm,
                input: {
                    organization: request.organization.id,
                    account: request.employee.account!,
                    process: request.id,
                },
            }));
    }

    public approvalPayload(
        props: Commands.Mappers.HRRequest.ApprovalPayload.Props,
    ): Commands.Mappers.HRRequest.ApprovalPayload.Result {
        return props.steps
            .filter((step) => step.status === HRApprovalStatus.ACTIVE && step.assigneeEmployee.account)
            .map((step) => {
                const request = step.request;
                const version = step.version + (props.created ? 0 : 1);
                const key = `hr:${request.organization.id}:${request.id}:${request.type}:${step.requestRevision}:step:${step.id}:${version}`;
                return {
                    actor: props.actor,
                    realm: props.realm,
                    input: {
                        dedupKey: key,
                        sourceService: PlatformService.HR_SERVICE,
                        kind: NotificationContentKind.TEMPLATE,
                        category: NotificationCategory.SYSTEM,
                        template: props.reassigned
                            ? MessageTemplate.HR_APPROVAL_REASSIGNED
                            : MessageTemplate.HR_APPROVAL_REQUIRED,
                        recipient: step.assigneeEmployee.account!,
                        params: { requestId: request.id, requestType: request.type },
                    },
                };
            });
    }

    public cancellationPayload(
        props: Commands.Mappers.HRRequest.CancellationPayload.Props,
    ): Commands.Mappers.HRRequest.CancellationPayload.Result {
        return props.previousSteps
            .filter((step) => step.status === HRApprovalStatus.ACTIVE && step.assigneeEmployee.account)
            .map((step) => {
                const request = step.request;
                const key = `hr:${request.organization.id}:${request.id}:${request.type}:${step.requestRevision}:step:${step.id}:${step.version}`;
                return {
                    actor: props.actor,
                    realm: props.realm,
                    input: {
                        invalidate: true,
                        dedupKey: key,
                        sourceService: PlatformService.HR_SERVICE,
                        recipient: step.assigneeEmployee.account!,
                    },
                };
            });
    }

    public outcomePayload(
        props: Commands.Mappers.HRRequest.OutcomePayload.Props,
    ): Commands.Mappers.HRRequest.OutcomePayload.Result {
        return props.requests.flatMap((request) => {
            let template: Topics.Notification.HRTemplate | undefined;
            if (props.execution) {
                if (request.executionStatus === HRExecutionStatus.APPLIED) {
                    template = MessageTemplate.HR_REQUEST_APPLIED;
                } else if (request.executionStatus === HRExecutionStatus.FAILED) {
                    template = MessageTemplate.HR_REQUEST_FAILED;
                }
            } else if (request.status === HRRequestStatus.APPROVED) {
                template = MessageTemplate.HR_REQUEST_APPROVED;
            } else if (request.status === HRRequestStatus.REJECTED) {
                template = MessageTemplate.HR_REQUEST_REJECTED;
            } else if (request.status === HRRequestStatus.DRAFT) {
                template = MessageTemplate.HR_REQUEST_RETURNED;
            }
            if (template) {
                const revision = template === MessageTemplate.HR_REQUEST_RETURNED ? request.revision - 1 : request.revision;
                const key = `hr:${request.organization.id}:${request.id}:${request.type}:${revision}:${template}`;
                return [
                    {
                        actor: props.actor,
                        realm: props.realm ?? request.organization.realm,
                        input: {
                            dedupKey: key,
                            kind: NotificationContentKind.TEMPLATE,
                            sourceService: PlatformService.HR_SERVICE,
                            category: NotificationCategory.SYSTEM,
                            template,
                            recipient: request.initiatorAccount,
                            params: { requestId: request.id, requestType: request.type },
                        },
                    },
                ];
            } else {
                return [];
            }
        });
    }
}
