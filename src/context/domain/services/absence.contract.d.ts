declare namespace Services.Absence {
    interface Contract extends ProcessorContract {}

    interface ProcessorContract {
        advanceStatus: AdvanceStatus.Signature;
        create: Create.Signature;
        cancel: Cancel.Signature;
    }

    namespace Create {
        type Props = {
            input: Omit<Entities.Absence.ConstructorProps, "organization" | "status" | "cancelledByRequest">;
            transaction: ORM.EntityManager;
            organization: string;
        };

        type Result = Entities.Absence;

        type Signature = (props: Props) => Result;
    }

    namespace AdvanceStatus {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
            at: Date;
        };

        type Result = Promise<Entities.Absence>;

        type Signature = (props: Props) => Result;
    }

    namespace Cancel {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            request: string;
            id: string;
        };

        type Result = Promise<Entities.Absence>;

        type Signature = (props: Props) => Result;
    }
}
