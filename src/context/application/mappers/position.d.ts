declare namespace Commands {
    namespace Mappers {
        namespace Position {
            interface Contract extends PublicContract {}

            interface PublicContract {
                placementPayload: PlacementPayload.Signature;
                lifecyclePayload: LifecyclePayload.Signature;
                confirmed: Confirmed.Signature;
                rejected: Rejected.Signature;
            }

            namespace Confirmed {
                type Props = {
                    request: Topics.Position.ReferenceRequestedMessage["payload"];
                };

                type Result = Topics.Position.ReferenceConfirmedMessage["payload"];

                type Signature = (props: Props) => Result;
            }

            namespace Rejected {
                type Props = {
                    request: Topics.Position.ReferenceRequestedMessage["payload"];
                    reason: string;
                };

                type Result = Topics.Position.ReferenceRejectedMessage["payload"];

                type Signature = (props: Props) => Result;
            }

            namespace PlacementPayload {
                type Props = {
                    position: Entities.Position;
                    actor: string;
                    realm: string;
                };

                type Result = Topics.Position.PlacementRequestedMessage["payload"];

                type Signature = (props: Props) => Result;
            }

            namespace LifecyclePayload {
                type Props = {
                    positions: Entities.Position[];
                    organization: string;
                    actor: string;
                    realm: string;
                };

                type Result = Topics.Position.LifecycleMessage["payload"];

                type Signature = (props: Props) => Result;
            }
        }
    }
}
