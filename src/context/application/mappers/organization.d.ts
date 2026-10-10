declare namespace Commands {
    namespace Mappers {
        namespace Organization {
            interface Contract extends PublicContract {}

            interface PublicContract {
                confirmed: Confirmed.Signature;
                rejected: Rejected.Signature;
            }

            namespace Confirmed {
                type Props = {
                    request: Topics.Realm.BootstrapOrganizationRequestedMessage["payload"];
                };

                type Result = Topics.Realm.BootstrapConfirmedMessage["payload"];

                type Signature = (props: Props) => Result;
            }

            namespace Rejected {
                type Props = {
                    request: Topics.Realm.BootstrapOrganizationRequestedMessage["payload"];
                    reason: string;
                };

                type Result = Topics.Realm.BootstrapRejectedMessage["payload"];

                type Signature = (props: Props) => Result;
            }
        }
    }
}
