declare namespace Unit.Domain.LeavePolicy {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            transaction: Unit.Domain.Core.Transaction;
            service: Services.LeavePolicy.Contract;
            repositories: {
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                leavePolicy: Unit.Domain.HR.RepositoryMock<Entities.LeavePolicy>;
                hrRequest: Unit.Domain.HR.RepositoryMock<Entities.HRRequest>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
