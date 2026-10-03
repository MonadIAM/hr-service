declare namespace Services.WorkSchedule {
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
            input: Omit<Entities.WorkSchedule.ConstructorProps, "organization" | "status" | "revision">;
            transaction: ORM.EntityManager;
            organization: string;
        };

        type Result = Entities.WorkSchedule;

        type Signature = (props: Props) => Result;
    }

    namespace CreateRevision {
        type Props = {
            input: Entities.WorkSchedule.CreateRevision.Props;
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.WorkSchedule>;

        type Signature = (props: Props) => Result;
    }

    namespace Archive {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.WorkSchedule>;

        type Signature = (props: Props) => Result;
    }

    namespace Restore {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.WorkSchedule>;

        type Signature = (props: Props) => Result;
    }

    namespace Purge {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.WorkSchedule>;

        type Signature = (props: Props) => Result;
    }
}
