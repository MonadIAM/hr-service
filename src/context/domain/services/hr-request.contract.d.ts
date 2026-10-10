declare namespace Services.HRRequest {
    interface Contract extends ProcessorContract, CommandContract, ServiceContract {}

    interface CommandContract {
        withdraw: Withdraw.Signature;
        create: Create.Signature;
        update: Update.Signature;
        submit: Submit.Signature;
    }

    namespace Withdraw {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace Create {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            input: Pick<
                Entities.HRRequest.ConstructorProps,
                "payloadSchemaVersion" | "idempotencyKey" | "payload" | "type" | "effectiveAt" | "initiatorAccount"
            > & {
                initiatorEmployee?: string;
                targetPosition?: string;
                relatedRequest?: string;
                employee: string;
            };
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace Update {
        type Props = {
            patch: Partial<Omit<Entities.HRRequest.MutableFields, "targetPosition" | "relatedRequest">> & {
                targetPosition?: string;
                relatedRequest?: string;
            };
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace Submit {
        type Props = {
            input: Entities.HRRequest.Submit.Props & {
                steps: {
                    assigneeEmployee: string;
                    name: string;
                    dueAt?: Date;
                }[];
            };
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    interface ServiceContract {
        returnForRevision: ReturnForRevision.Signature;
        approve: Approve.Signature;
        reject: Reject.Signature;
    }

    namespace Approve {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace Reject {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace ReturnForRevision {
        type Props = {
            transaction: ORM.EntityManager;
            organization: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    interface ProcessorContract {
        scheduleApplication: ScheduleApplication.Signature;
        beginApplication: BeginApplication.Signature;
        markApplied: MarkApplied.Signature;
        markFailed: MarkFailed.Signature;
        cancel: Cancel.Signature;
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
