declare namespace Commands.Mappers.HRRequest {
    interface Contract {
        leavePayload: LeavePayload.Signature;
    }

    namespace LeavePayload {
        type Props = {
            requests: Entities.HRRequest[];
        };

        type Result = Topics.Realm.MembershipLeaveRequestedMessage["payload"][];

        type Signature = (props: Props) => Result;
    }
}
