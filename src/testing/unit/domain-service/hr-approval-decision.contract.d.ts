declare namespace Unit.Domain.HRApprovalDecision {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.HRApprovalDecision.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {};
            services: {};
        };

        type Signature = () => Result;
    }
}
