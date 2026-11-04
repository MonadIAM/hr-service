declare namespace Services.HRRequest {
    interface Contract extends CommandContract, ServiceContract {}

    interface CommandContract {
        withdraw: Withdraw.Signature;
        create: Create.Signature;
        update: Update.Signature;
        submit: Submit.Signature;
    }

    namespace Withdraw {
        type Props = {
            transaction: ORM.EntityManager;
            permissions: string[];
            organization: string;
            actor: string;
            realm: string;
            id: string;
        };

        type Result = Promise<Entities.HRRequest>;

        type Signature = (props: Props) => Result;
    }

    namespace Create {
        type Props = {
            input: Pick<
                Entities.HRRequest.ConstructorProps,
                "payloadSchemaVersion" | "idempotencyKey" | "payload" | "type" | "effectiveAt"
            > & {
                initiatorEmployee?: string;
                targetPosition?: string;
                relatedRequest?: string;
                employee: string;
            };
            transaction: ORM.EntityManager;
            permissions: string[];
            organization: string;
            actor: string;
            realm: string;
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
            permissions: string[];
            organization: string;
            actor: string;
            realm: string;
            type: Entities.HRRequest["type"];
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
            permissions: string[];
            organization: string;
            actor: string;
            realm: string;
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
}
