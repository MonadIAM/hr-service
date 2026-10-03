declare namespace Repositories.HRApprovalStep {
    interface Contract extends Repositories.Base.Contract<
        Entities.HRApprovalStep,
        Repositories.Mappers.HRApprovalStep.Types
    > {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
