declare namespace Repositories.LeaveLedgerEntry {
    interface Contract extends Repositories.Base.Contract<
        Entities.LeaveLedgerEntry,
        Repositories.Mappers.LeaveLedgerEntry.Types
    > {
        getBalances: GetBalances.Signature;
    }

    namespace GetBalances {
        type Props = {
            transaction: ORM.EntityManager;
            employees: string[];
            at: Date;
        };

        type Result = Promise<{ available: string; employee: string; poolCode: string; unit: string }[]>;

        type Signature = (props: Props) => Result;
    }

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
