declare namespace Services.WorkCalendarException {
    interface Contract extends CommandContract {}

    interface CommandContract {
        create: Create.Signature;
        update: Update.Signature;
        purge: Purge.Signature;
    }

    namespace Create {
        type Props = {
            input: Omit<Entities.WorkCalendarException.ConstructorProps, "organization" | "calendar"> & {
                calendar: string;
            };
            transaction: ORM.EntityManager;
            organization: string;
        };

        type Result = Promise<Entities.WorkCalendarException>;

        type Signature = (props: Props) => Result;
    }

    namespace Update {
        type Props = {
            patch: Partial<Entities.WorkCalendarException.MutableFields>;
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.WorkCalendarException>;

        type Signature = (props: Props) => Result;
    }

    namespace Purge {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.WorkCalendarException>;

        type Signature = (props: Props) => Result;
    }
}
