declare namespace Repositories.HRApprovalDecision {
    interface Contract extends Repositories.Base.Contract<
        Entities.HRApprovalDecision,
        Repositories.Mappers.HRApprovalDecision.Types
    > {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
