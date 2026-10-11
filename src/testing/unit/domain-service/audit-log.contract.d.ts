declare namespace Unit.Domain.AuditLog {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.AuditLog.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                auditLog: Unit.Domain.HR.RepositoryMock<SystemEntities.AuditLog>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
