declare namespace Repositories.LeaveLedgerEntry {
    interface Contract extends Repositories.Base.Contract<
        Entities.LeaveLedgerEntry,
        Repositories.Mappers.LeaveLedgerEntry.Types
    > {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
