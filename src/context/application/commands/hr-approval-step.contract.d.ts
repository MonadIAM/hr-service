declare namespace Commands.HRApprovalStep {
    interface Contract extends ControllerContract {}

    interface ControllerContract {
        returnForRevision: ReturnForRevision.Signature;
        reassign: Reassign.Signature;
        approve: Approve.Signature;
        reject: Reject.Signature;
    }

    namespace Reassign {
        type ExecuteResult = {
            previousSteps: Entities.HRApprovalStep[];
            steps: Entities.HRApprovalStep[];
            reassigned: boolean;
            actor: string;
            realm: string;
        };

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
        type ExecuteResult = {
            previousSteps: Entities.HRApprovalStep[];
            steps: Entities.HRApprovalStep[];
            requests: Entities.HRRequest[];
            actor: string;
            realm: string;
        };

        type Props = {
            id: string;
            actor: string;
            realm: string;
            organization: string;
            context: Extract.Meta;
            input: {
                actorEmployee: string;
                comment?: string;
                reason: string;
            };
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace Reject {
        type ExecuteResult = {
            previousSteps: Entities.HRApprovalStep[];
            requests: Entities.HRRequest[];
            actor: string;
            realm: string;
        };

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
            actor: string;
            realm: string;
            organization: string;
            context: Extract.Meta;
            input: {
                actorEmployee: string;
                comment?: string;
                reason: string;
            };
        };

        type ExecuteResult = {
            previousSteps: Entities.HRApprovalStep[];
            requests: Entities.HRRequest[];
            actor: string;
            realm: string;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }
}
