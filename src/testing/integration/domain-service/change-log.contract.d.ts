declare namespace Integration.Domain.ChangeLog {
    type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Context = {
            service: Services.ChangeLog.Contract;
            repositories: {
                changeLog: globalThis.Repositories.ChangeLog.Contract;
            };
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }
}
