declare namespace Commands.Employee {
    interface Contract extends ControllerContract {}

    interface ControllerContract {
        unlinkAccount: UnlinkAccount.Signature;
        linkAccount: LinkAccount.Signature;
        archive: Archive.Signature;
        restore: Restore.Signature;
        setHRBP: SetHRBP.Signature;
        create: Create.Signature;
        update: Update.Signature;
    }

    namespace Create {
        type Props = {
            organization: string;
            actor: string;
            realm: string;
            input: {
                employeeNumber: string;
                middleName?: string;
                workEmail?: string;
                firstName: string;
                lastName: string;
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
                patch: Partial<Entities.Employee.MutableFields>;
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace LinkAccount {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                account: string;
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }

    namespace UnlinkAccount {
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

    namespace SetHRBP {
        type Props = {
            id: string;
            organization: string;
            actor: string;
            realm: string;
            input: {
                employee?: string;
                reason: string;
            };
            context: Extract.Meta;
        };

        type Result = Promise<MessageResult>;

        type Signature = (props: Props) => Result;
    }
}
