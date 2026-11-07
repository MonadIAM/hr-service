declare namespace Services.HRRequestExecution {
    interface Contract extends ProcessorContract, ConsumerContract {}

    interface ConsumerContract {
        completeHire: CompleteHire.Signature;
        confirmLeave: ConfirmLeave.Signature;
        rejectLeave: RejectLeave.Signature;
    }

    namespace BeginHire {
        type Props = {
            transaction: ORM.EntityManager;
            identifiers: string[];
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace CompleteHire {
        type Props = {
            input:
                | Topics.Realm.MembershipEnsureConfirmedMessage["payload"]["input"]
                | Topics.Realm.MembershipEnsureRejectedMessage["payload"]["input"];
            transaction: ORM.EntityManager;
            actor: string;
            realm: string;
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace ConfirmLeave {
        type Props = Topics.Realm.MembershipLeaveConfirmedMessage["payload"] & {
            transaction: ORM.EntityManager;
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace RejectLeave {
        type Props = Topics.Realm.MembershipLeaveRejectedMessage["payload"] & {
            transaction: ORM.EntityManager;
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    interface ProcessorContract {
        scheduleApplication: ScheduleApplication.Signature;
        beginApplication: BeginApplication.Signature;
        advanceAbsences: AdvanceAbsences.Signature;
        cancelRequests: CancelRequests.Signature;
        recordOvertime: RecordOvertime.Signature;
        beginAbsence: BeginAbsence.Signature;
        adjustLeave: AdjustLeave.Signature;
        markApplied: MarkApplied.Signature;
        changeTerms: ChangeTerms.Signature;
        beginLeave: BeginLeave.Signature;
        markFailed: MarkFailed.Signature;
        beginHire: BeginHire.Signature;
        transfer: Transfer.Signature;
        cancel: Cancel.Signature;
    }

    namespace CancelRequests {
        type Props = {
            transaction: ORM.EntityManager;
            identifiers: string[];
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace RecordOvertime {
        type Props = {
            transaction: ORM.EntityManager;
            identifiers: string[];
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace BeginAbsence {
        type Props = {
            transaction: ORM.EntityManager;
            identifiers: string[];
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace AdvanceAbsences {
        type Props = {
            transaction: ORM.EntityManager;
            identifiers: string[];
            at: Date;
        };

        type Result = Promise<Entities.Absence[]>;

        type Signature = (props: Props) => Result;
    }

    namespace AdjustLeave {
        type Props = {
            transaction: ORM.EntityManager;
            identifiers: string[];
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace ChangeTerms {
        type Props = {
            transaction: ORM.EntityManager;
            identifiers: string[];
        };

        type Result = Promise<Entities.HRRequest[]>;

        type Signature = (props: Props) => Result;
    }

    namespace Transfer {
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
