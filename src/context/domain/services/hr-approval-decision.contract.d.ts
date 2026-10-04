declare namespace Services.HRApprovalDecision {
    interface Contract extends ServiceContract {}

    interface ServiceContract {
        create: Create.Signature;
    }

    namespace Create {
        type Props = {
            transaction: ORM.EntityManager;
            organization: Entities.Organization;
            input: Omit<
                Entities.HRApprovalDecision.ConstructorProps,
                "organization" | "request" | "requestRevision" | "decidedAt"
            >;
        };

        type Result = Entities.HRApprovalDecision;

        type Signature = (props: Props) => Result;
    }
}
