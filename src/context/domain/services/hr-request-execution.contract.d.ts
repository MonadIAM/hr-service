declare namespace Services.HRRequestExecution {
    interface Contract extends ProcessorContract, ConsumerContract {}

    interface ConsumerContract {
        confirmLeave: ConfirmLeave.Signature;
        rejectLeave: RejectLeave.Signature;
    }

    namespace ConfirmLeave {
        type Props = Topics.Realm.MembershipLeaveConfirmedMessage["payload"] & {
            transaction: ORM.EntityManager;
        };

        type Result = Promise<void>;

        type Signature = (props: Props) => Result;
    }

    namespace RejectLeave {
        type Props = Topics.Realm.MembershipLeaveRejectedMessage["payload"] & {
            transaction: ORM.EntityManager;
        };

        type Result = Promise<void>;

        type Signature = (props: Props) => Result;
    }

    interface ProcessorContract {
        scheduleApplication: ScheduleApplication.Signature;
        beginApplication: BeginApplication.Signature;
        markApplied: MarkApplied.Signature;
        changeTerms: ChangeTerms.Signature;
        beginLeave: BeginLeave.Signature;
        markFailed: MarkFailed.Signature;
        cancel: Cancel.Signature;
    }

    namespace ChangeTerms {
        type Props = {
            transaction: ORM.EntityManager;
            identifiers: string[];
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace BeginLeave {
        type Props = {
            transaction: ORM.EntityManager;
            identifiers: string[];
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace Cancel {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace ScheduleApplication {
        type Props = {
            input: Entities.HRRequest.ScheduleApplication.Props;
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace BeginApplication {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace MarkApplied {
        type Props = {
            input: Entities.HRRequest.MarkApplied.Props;
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace MarkFailed {
        type Props = {
            input: Entities.HRRequest.MarkFailed.Props;
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }
}
