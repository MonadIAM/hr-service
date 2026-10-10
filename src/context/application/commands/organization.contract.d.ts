declare namespace Commands.Organization {
    interface Contract extends ConsumerContract {}

    interface ConsumerContract {
        rejectBootstrap: RejectBootstrap.Signature;
        bootstrap: Bootstrap.Signature;
        purge: Purge.Signature;
    }

    namespace Bootstrap {
        type Props = Topics.Realm.BootstrapOrganizationRequestedMessage["payload"] & {
            incoming: TransactionManager.Service.IncomingMessage;
        };

        type Result = Promise<void>;

        type Signature = (props: Props) => Result;
    }

    namespace RejectBootstrap {
        type Props = {
            request: Topics.Realm.BootstrapOrganizationRequestedMessage["payload"];
            incoming: TransactionManager.Service.IncomingMessage;
            reason: string;
        };

        type Result = Promise<void>;

        type Signature = (props: Props) => Result;
    }

    namespace Purge {
        type Props = Topics.Realm.SystemLifecycleMessage["payload"] & {
            incoming: TransactionManager.Service.IncomingMessage;
        };

        type Result = Promise<void>;

        type Signature = (props: Props) => Result;
    }
}
