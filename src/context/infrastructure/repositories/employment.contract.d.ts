declare namespace Repositories.Employment {
    interface Contract extends Repositories.Base.Contract<Entities.Employment, Repositories.Mappers.Employment.Types> {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
