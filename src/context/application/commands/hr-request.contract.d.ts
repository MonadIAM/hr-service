import { HRRequestType } from "~context/enums";

declare global {
    namespace Commands.HRRequest {
        interface Contract extends ProcessorContract, ConsumerContract, ControllerContract {}

        interface ProcessorContract {
            terminate: Terminate.Signature;
        }

        namespace Terminate {
            type Props = {
                batchSize: number;
            };

            type Result = Promise<number>;

            type Signature = (props: Props) => Result;
        }

        interface ConsumerContract {
            confirmLeave: ConfirmLeave.Signature;
            rejectLeave: RejectLeave.Signature;
        }

        namespace ConfirmLeave {
            type Props = Topics.Realm.MembershipLeaveConfirmedMessage["payload"] & {
                incoming: TransactionManager.Service.IncomingMessage;
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        namespace RejectLeave {
            type Props = Topics.Realm.MembershipLeaveRejectedMessage["payload"] & {
                incoming: TransactionManager.Service.IncomingMessage;
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        interface ControllerContract {
            withdraw: Withdraw.Signature;
            create: Create.Signature;
            update: Update.Signature;
            submit: Submit.Signature;
        }

        namespace Create {
            type Props = {
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
                permissions: string[];
                context: Extract.Meta;
                organization: string;
                actor: string;
                realm: string;
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }

        namespace Update {
            type Props = {
                input: {
                    patch: Partial<Omit<Entities.HRRequest.MutableFields, "targetPosition" | "relatedRequest">> & {
                        targetPosition?: string;
                        relatedRequest?: string;
                    };
                    reason: string;
                };
                permissions: string[];
                context: Extract.Meta;
                organization: string;
                actor: string;
                realm: string;
                id: string;
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }

        namespace Submit {
            type Props = {
                input: {
                    steps: {
                        assigneeEmployee: string;
                        dueAt?: Date;
                        name: string;
                    }[];
                    workflowVersion: number;
                    workflowCode: string;
                };
                permissions: string[];
                context: Extract.Meta;
                organization: string;
                actor: string;
                realm: string;
                id: string;
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }

        namespace Withdraw {
            type Props = {
                input: {
                    reason: string;
                };
                permissions: string[];
                context: Extract.Meta;
                organization: string;
                actor: string;
                realm: string;
                id: string;
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }
    }
}
