declare namespace Commands.Mappers.HRRequest {
    interface Contract {
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
}
