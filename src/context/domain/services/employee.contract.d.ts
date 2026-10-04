declare namespace Services.Employee {
    interface Contract extends ProcessorContract, CommandContract {}

    interface CommandContract {
        unlinkAccount: UnlinkAccount.Signature;
        linkAccount: LinkAccount.Signature;
        archive: Archive.Signature;
        restore: Restore.Signature;
        setHRBP: SetHRBP.Signature;
        create: Create.Signature;
        update: Update.Signature;
    }

    interface ProcessorContract {
        changeTerms: ChangeTerms.Signature;
        terminate: Terminate.Signature;
        hire: Hire.Signature;
    }

    namespace Create {
        type Props = {
            input: Entities.Employee.MutableFields;
            transaction: ORM.EntityManager;
            organization: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }

    namespace Update {
        type Props = {
            patch: Partial<Entities.Employee.MutableFields>;
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }

    namespace LinkAccount {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            account: string;
            id: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }

    namespace UnlinkAccount {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }

    namespace Archive {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }

    namespace Restore {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }

    namespace SetHRBP {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            employee?: string;
            id: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }

    namespace Hire {
        type Props = {
            input: Omit<Entities.Employee.ChangeTerms.Props, "workCalendar" | "workSchedule" | "leavePolicy"> & {
                workCalendar: string;
                workSchedule: string;
                leavePolicy: string;
            } & {
                employmentStartedOn: string;
            };
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }

    namespace ChangeTerms {
        type Props = {
            input: Omit<Entities.Employee.ChangeTerms.Props, "workCalendar" | "workSchedule" | "leavePolicy"> & {
                workCalendar: string;
                workSchedule: string;
                leavePolicy: string;
            };
            transaction: ORM.EntityManager;
            organization: string;
            request?: string;
            id: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }

    namespace Terminate {
        type Props = {
            input: Entities.Employee.Terminate.Props;
            transaction: ORM.EntityManager;
            organization: string;
            request?: string;
            id: string;
        };

        type Result = Promise<Entities.Employee>;

        type Signature = (props: Props) => Result;
    }
}
