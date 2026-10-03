declare namespace Commands.HRApprovalStep {
    interface Contract extends ControllerContract {}

    interface ControllerContract {
        returnForRevision: ReturnForRevision.Signature;
        reassign: Reassign.Signature;
        approve: Approve.Signature;
        reject: Reject.Signature;
    }

    namespace Reassign {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                employee: string;
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace Approve {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                actorEmployee: string;
                comment?: string;
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace Reject {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                actorEmployee: string;
                comment?: string;
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace ReturnForRevision {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                actorEmployee: string;
                comment?: string;
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }
}
