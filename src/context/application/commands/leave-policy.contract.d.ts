declare namespace Commands.LeavePolicy {
    interface Contract extends ControllerContract {}

    interface ControllerContract {
        createRevision: CreateRevision.Signature;
        archive: Archive.Signature;
        restore: Restore.Signature;
        create: Create.Signature;
        purge: Purge.Signature;
    }

    namespace Create {
        type Props = {
            organization: string;
            actor: string;
            realm: string;
            input: {
                rules: Entities.LeavePolicy.Rule[];
                jurisdiction: string;
                code: string;
                name: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace CreateRevision {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: Entities.LeavePolicy.CreateRevision.Props;
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace Archive {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace Restore {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace Purge {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }
}
