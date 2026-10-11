declare namespace Unit.Domain.ChangeLog {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.ChangeLog.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                changeLog: Unit.Domain.HR.RepositoryMock<SystemEntities.ChangeLog>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
