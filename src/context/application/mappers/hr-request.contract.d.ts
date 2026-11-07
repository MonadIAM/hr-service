declare namespace Commands.Mappers.HRRequest {
    interface Contract {
        cancellationPayload: CancellationPayload.Signature;
        approvalPayload: ApprovalPayload.Signature;
        outcomePayload: OutcomePayload.Signature;
        leavePayload: LeavePayload.Signature;
        hirePayload: HirePayload.Signature;
    }

    namespace HirePayload {
        type Props = {
            requests: Entities.HRRequest[];
        };

        type Result = Topics.Realm.MembershipEnsureRequestedMessage["payload"][];

        type Signature = (props: Props) => Result;
    }

    namespace LeavePayload {
        type Props = {
            requests: Entities.HRRequest[];
        };

        type Result = Topics.Realm.MembershipLeaveRequestedMessage["payload"][];

        type Signature = (props: Props) => Result;
    }
    namespace ApprovalPayload {
        type Props = {
            steps: Entities.HRApprovalStep[];
            reassigned?: boolean;
            created?: boolean;
            actor?: string;
            realm: string;
        };

        type Result = Topics.Notification.CreateMessage["payload"][];

        type Signature = (props: Props) => Result;
    }

    namespace CancellationPayload {
        type Props = {
            previousSteps: Entities.HRApprovalStep[];
            actor?: string;
            realm: string;
        };

        type Result = Topics.Notification.CancelMessage["payload"][];

        type Signature = (props: Props) => Result;
    }

    namespace OutcomePayload {
        type Props = {
            requests: Entities.HRRequest[];
            execution?: boolean;
            realm?: string;
            actor?: string;
        };

        type Result = Topics.Notification.CreateMessage["payload"][];

        type Signature = (props: Props) => Result;
    }
}
