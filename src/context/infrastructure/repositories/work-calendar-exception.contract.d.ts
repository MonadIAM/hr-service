declare namespace Repositories.WorkCalendarException {
    interface Contract extends Repositories.Base.Contract<
        Entities.WorkCalendarException,
        Repositories.Mappers.WorkCalendarException.Types
    > {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
