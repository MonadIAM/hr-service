declare namespace Services.PositionAssignment {
    interface Contract extends ProcessorContract {}

    interface ProcessorContract {
        transfer: Transfer.Signature;
        create: Create.Signature;
        close: Close.Signature;
        void: Void.Signature;
    }

    namespace Create {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            input: Pick<
                Entities.PositionAssignment.ConstructorProps,
                "salaryPeriod" | "salaryCurrency" | "salaryAmount" | "validFrom" | "fte"
            > & {
                sourceRequest?: string;
                employee: string;
                position: string;
            };
        };

        type Result = Promise<Entities.PositionAssignment>;

        type Signature = (props: Props) => Result;
    }

    namespace Close {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            request?: string;
            validTo: string;
            id: string;
        };

        type Result = Promise<Entities.PositionAssignment>;

        type Signature = (props: Props) => Result;
    }

    namespace Void {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.PositionAssignment>;

        type Signature = (props: Props) => Result;
    }

    namespace Transfer {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            input: Pick<
                Entities.PositionAssignment.ConstructorProps,
                "salaryPeriod" | "salaryCurrency" | "salaryAmount" | "validFrom" | "fte"
            > & {
                sourceRequest?: string;
                employee: string;
                position: string;
            };
            id: string;
        };

        type Result = Promise<Entities.PositionAssignment>;

        type Signature = (props: Props) => Result;
    }
}
