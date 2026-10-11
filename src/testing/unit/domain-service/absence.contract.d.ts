declare namespace Unit.Domain.Absence {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.Absence.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                hrRequest: Unit.Domain.HR.RepositoryMock<Entities.HRRequest>;
                absence: Unit.Domain.HR.RepositoryMock<Entities.Absence>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
