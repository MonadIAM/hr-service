declare namespace Services.Position {
    interface Contract extends CommandContract {}

    interface CommandContract {
        archive: Archive.Signature;
        restore: Restore.Signature;
        create: Create.Signature;
        update: Update.Signature;
        purge: Purge.Signature;
    }

    namespace Create {
        type Props = {
            input: Omit<Entities.Position.ConstructorProps, "organization" | "status">;
            transaction: ORM.EntityManager;
            organization: string;
        };

        type Result = Promise<Entities.Position>;

        type Signature = (props: Props) => Result;
    }

    namespace Update {
        type Props = {
            patch: Partial<Entities.Position.MutableFields>;
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.Position>;

        type Signature = (props: Props) => Result;
    }

    namespace Archive {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.Position>;

        type Signature = (props: Props) => Result;
    }

    namespace Restore {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.Position>;

        type Signature = (props: Props) => Result;
    }

    namespace Purge {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.Position>;

        type Signature = (props: Props) => Result;
    }
}
