declare namespace Services.LeavePolicy {
    interface Contract extends CommandContract {}

    interface CommandContract {
        createRevision: CreateRevision.Signature;
        archive: Archive.Signature;
        restore: Restore.Signature;
        create: Create.Signature;
        purge: Purge.Signature;
    }

    namespace Create {
        type Props = {
            input: Omit<Entities.LeavePolicy.ConstructorProps, "organization" | "status" | "revision">;
            transaction: ORM.EntityManager;
            organization: string;
        };

        type Result = Entities.LeavePolicy;

        type Signature = (props: Props) => Result;
    }

    namespace CreateRevision {
        type Props = {
            input: Entities.LeavePolicy.CreateRevision.Props;
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.LeavePolicy>;

        type Signature = (props: Props) => Result;
    }

    namespace Archive {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.LeavePolicy>;

        type Signature = (props: Props) => Result;
    }

    namespace Restore {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.LeavePolicy>;

        type Signature = (props: Props) => Result;
    }

    namespace Purge {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.LeavePolicy>;

        type Signature = (props: Props) => Result;
    }
}
