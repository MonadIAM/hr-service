import { HRExecutionStatus } from "~context/enums";

export class HRRequestMapper implements Commands.Mappers.HRRequest.Contract {
    public leavePayload(
        props: Commands.Mappers.HRRequest.LeavePayload.Props,
    ): Commands.Mappers.HRRequest.LeavePayload.Result {
        return props.requests
            .filter((request) => request.employee.account && request.executionStatus === HRExecutionStatus.RUNNING)
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
