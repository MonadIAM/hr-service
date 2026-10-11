declare namespace Integration.Domain.AuditLog {
    type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Context = {
            service: Services.AuditLog.Contract;
            repositories: {
                auditLog: globalThis.Repositories.AuditLog.Contract;
            };
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }
}
