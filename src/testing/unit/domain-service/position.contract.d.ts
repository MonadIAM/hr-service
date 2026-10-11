declare namespace Unit.Domain.Position {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.Position.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                positionAssignment: Unit.Domain.HR.RepositoryMock<Entities.PositionAssignment>;
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                position: Unit.Domain.HR.RepositoryMock<Entities.Position>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
