declare namespace Services.Position {
    interface Contract extends CommandContract {}

    interface CommandContract {
        completePlacement: CompletePlacement.Signature;
        validateReference: ValidateReference.Signature;
        purgeDepartment: PurgeDepartment.Signature;
        purgeTeam: PurgeTeam.Signature;
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

    namespace CompletePlacement {
        type Props = Topics.Position.PlacementRequestedMessage["payload"] & {
            transaction: ORM.EntityManager;
            rejected: boolean;
        };

        type Result = Promise<void>;

        type Signature = (props: Props) => Result;
    }

    namespace ValidateReference {
        type Props = Topics.Position.ReferenceRequestedMessage["payload"] & {
            transaction: ORM.EntityManager;
        };

        type Result = Promise<void>;

        type Signature = (props: Props) => Result;
    }

    namespace PurgeDepartment {
        type Props = Topics.Position.DepartmentPurgedMessage["payload"] & {
            transaction: ORM.EntityManager;
        };

        type Result = Promise<Entities.Position[]>;

        type Signature = (props: Props) => Result;
    }

    namespace PurgeTeam {
        type Props = Topics.Position.TeamPurgedMessage["payload"] & {
            transaction: ORM.EntityManager;
        };

        type Result = Promise<Entities.Position[]>;

        type Signature = (props: Props) => Result;
    }
}
