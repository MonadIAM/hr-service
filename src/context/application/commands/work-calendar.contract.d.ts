declare namespace Commands.WorkCalendar {
    interface Contract extends ControllerContract {}

    interface ControllerContract {
        archive: Archive.Signature;
        restore: Restore.Signature;
        create: Create.Signature;
        update: Update.Signature;
        purge: Purge.Signature;
    }

    namespace Create {
        type Props = {
            organization: string;
            actor: string;
            realm: string;
            input: {
                holidays: Entities.WorkCalendar.Holiday[];
                verifiedThrough?: string;
                countryCode: string;
                regionCode?: string;
                code: string;
                name: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace Update {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                patch: Partial<Entities.WorkCalendar.MutableFields>;
                reason: string;
            };
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
