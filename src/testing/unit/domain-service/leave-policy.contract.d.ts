declare namespace Unit.Domain.LeavePolicy {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.LeavePolicy.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                leavePolicy: Unit.Domain.HR.RepositoryMock<Entities.LeavePolicy>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
