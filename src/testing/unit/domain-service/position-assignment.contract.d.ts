declare namespace Unit.Domain.PositionAssignment {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.PositionAssignment.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                positionAssignment: Unit.Domain.HR.RepositoryMock<Entities.PositionAssignment>;
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                hrRequest: Unit.Domain.HR.RepositoryMock<Entities.HRRequest>;
                employee: Unit.Domain.HR.RepositoryMock<Entities.Employee>;
                position: Unit.Domain.HR.RepositoryMock<Entities.Position>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
