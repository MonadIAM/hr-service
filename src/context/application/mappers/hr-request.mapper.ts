import { HRExecutionStatus, HRRequestType } from "~context/enums";

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
}
