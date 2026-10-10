declare namespace Services.Organization {
    interface Contract extends CommandContract {}

    interface CommandContract {
        bootstrap: Bootstrap.Signature;
        purge: Purge.Signature;
    }

    namespace Bootstrap {
        type Props = Topics.Realm.BootstrapOrganizationRequestedMessage["payload"] & {
            transaction: ORM.EntityManager;
        };

        type Result = Promise<void>;

        type Signature = (props: Props) => Result;
    }

    namespace Purge {
        type Props = {
            transaction: ORM.EntityManager;
            realm: string;
        };

        type Result = Promise<void>;

        type Signature = (props: Props) => Result;
    }
}
