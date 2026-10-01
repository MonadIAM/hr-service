declare namespace Fixtures.Core {
    interface Contract {
        createChangeLog: CreateChangeLog.Signature;
        createAuditLog: CreateAuditLog.Signature;
    }

    namespace CreateAuditLog {
        type Props = Omit<Partial<SystemEntities.AuditLog.ConstructorProps>, "context"> & {
            context?: Partial<Extract.Meta>;
            createdAt?: Date;
        };

        type Result = Promise<SystemEntities.AuditLog>;

        type Signature = (props?: Props) => Result;
    }

    namespace CreateChangeLog {
        type Props = Omit<Partial<SystemEntities.ChangeLog.ConstructorProps>, "auditEntry"> & {
            auditEntry?: SystemEntities.AuditLog;
        };

        type Result = Promise<SystemEntities.ChangeLog>;

        type Signature = (props?: Props) => Result;
    }
}
