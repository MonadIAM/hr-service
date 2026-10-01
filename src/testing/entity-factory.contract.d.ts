declare namespace Testing.EntityFactory {
    interface Contract {
        createChangeLog: CreateChangeLog.Signature;
        createAuditLog: CreateAuditLog.Signature;
    }

    namespace CreateAuditLog {
        type Props = Partial<SystemEntities.AuditLog> & {
            context?: Partial<SystemEntities.AuditLog.ConstructorProps["context"]>;
        };

        type Result = SystemEntities.AuditLog;

        type Signature = (props?: Props) => Result;
    }

    namespace CreateChangeLog {
        type Props = Partial<SystemEntities.ChangeLog>;

        type Result = SystemEntities.ChangeLog;

        type Signature = (props?: Props) => Result;
    }
}
