declare namespace Repositories.Absence {
    interface Contract extends Repositories.Base.Contract<Entities.Absence, Repositories.Mappers.Absence.Types> {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
