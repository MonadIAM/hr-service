declare namespace Unit.Domain.Organization {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.Organization.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
