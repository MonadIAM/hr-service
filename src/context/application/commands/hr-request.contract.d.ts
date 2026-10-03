import { HRRequestType } from "~context/enums";

declare global {
    namespace Commands.HRRequest {
        interface Contract extends ControllerContract {}

        interface ControllerContract {
            withdraw: Withdraw.Signature;
            create: Create.Signature;
            update: Update.Signature;
            submit: Submit.Signature;
        }

        namespace Create {
            type Props = {
                organization: string;
                actor: string;
                realm: string;
                input: {
                    payloadSchemaVersion: number;
                    initiatorEmployee?: string;
                    relatedRequest?: string;
                    targetPosition?: string;
                    idempotencyKey: string;
                    payload: UnknownObject;
                    type: HRRequestType;
                    effectiveAt?: Date;
                    employee: string;
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
                    patch: Partial<Omit<Entities.HRRequest.MutableFields, "targetPosition" | "relatedRequest">> & {
                        targetPosition?: string;
                        relatedRequest?: string;
                    };
                    reason: string;
                };
                context: Extract.Meta;
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }

        namespace Submit {
            type Props = {
                id: string;
                organization: string;
                actor: string;
                realm: string;
                input: {
                    workflowVersion: number;
                    workflowCode: string;
                    steps: {
                        assigneeEmployee: string;
                        dueAt?: Date;
                        name: string;
                    }[];
                };
                context: Extract.Meta;
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }

        namespace Withdraw {
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
}
