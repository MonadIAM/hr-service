declare namespace Services.LeaveLedgerEntry {
    interface Contract extends ProcessorContract {}

    interface ProcessorContract {
        reverse: Reverse.Signature;
        create: Create.Signature;
    }

    namespace Create {
        type Props = {
            input: Omit<Entities.LeaveLedgerEntry.ConstructorProps, "organization" | "reversesEntry">;
            transaction: ORM.EntityManager;
            organization: string;
        };

        type Result = Entities.LeaveLedgerEntry;

        type Signature = (props: Props) => Result;
    }

    namespace Reverse {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            input: Pick<
                Entities.LeaveLedgerEntry.ConstructorProps,
                "idempotencyKey" | "effectiveOn" | "reason" | "sourceRequest"
            >;
            id: string;
        };

        type Result = Promise<Entities.LeaveLedgerEntry>;

        type Signature = (props: Props) => Result;
    }
}
