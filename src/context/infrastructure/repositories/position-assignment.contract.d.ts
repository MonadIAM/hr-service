declare namespace Repositories.PositionAssignment {
    interface Contract extends Repositories.Base.Contract<
        Entities.PositionAssignment,
        Repositories.Mappers.PositionAssignment.Types
    > {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
