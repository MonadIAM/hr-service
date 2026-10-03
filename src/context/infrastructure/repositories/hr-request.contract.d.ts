declare namespace Repositories.HRRequest {
    interface Contract extends Repositories.Base.Contract<Entities.HRRequest, Repositories.Mappers.HRRequest.Types> {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
