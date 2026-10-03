declare namespace Services.HRApprovalStep {
    interface Contract extends CommandContract, ServiceContract {}

    interface CommandContract {
        reassign: Reassign.Signature;
        decide: Decide.Signature;
    }

    interface ServiceContract {
        activate: Activate.Signature;
        create: Create.Signature;
        skip: Skip.Signature;
    }

    namespace Create {
        type Props = {
            input: {
                assigneeEmployee: Entities.Employee;
                request: Entities.HRRequest;
                ordinal: number;
                name: string;
                dueAt?: Date;
            };
            transaction: ORM.EntityManager;
            organization: string;
        };

        type Result = Entities.HRApprovalStep;

        type Signature = (props: Props) => Result;
    }

    namespace Reassign {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            employee: string;
            id: string;
        };

        type Result = Promise<Entities.HRApprovalStep>;

        type Signature = (props: Props) => Result;
    }

    namespace Activate {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRApprovalStep>;

        type Signature = (props: Props) => Result;
    }

    namespace Skip {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRApprovalStep>;

        type Signature = (props: Props) => Result;
    }

    namespace Decide {
        type Props = {
            decision: Entities.HRApprovalDecision["decision"];
            transaction: ORM.EntityManager;
            actorEmployee: string;
            organization: string;
            actorAccount: string;
            comment?: string;
            id: string;
        };

        type Result = Promise<Entities.HRApprovalStep>;

        type Signature = (props: Props) => Result;
    }
}
