import { HRRequestType } from "~context/enums";

declare global {
    namespace Commands.HRRequest {
        interface Contract extends ProcessorContract, ConsumerContract, ControllerContract {}

        interface ProcessorContract {
            advanceAbsences: AdvanceAbsences.Signature;
            execute: Execute.Signature;
        }

        namespace AdvanceAbsences {
            type Props = {
                batchSize: number;
            };

            type Result = Promise<number>;

            type Signature = (props: Props) => Result;
        }

        namespace Execute {
            type Props = {
                batchSize: number;
            };

            type Result = Promise<number>;

            type Signature = (props: Props) => Result;
        }

        interface ConsumerContract {
            completeHire: CompleteHire.Signature;
            confirmLeave: ConfirmLeave.Signature;
            rejectLeave: RejectLeave.Signature;
        }

        namespace CompleteHire {
            type Props = {
                input:
                    | Topics.Realm.MembershipEnsureConfirmedMessage["payload"]["input"]
                    | Topics.Realm.MembershipEnsureRejectedMessage["payload"]["input"];
                incoming: TransactionManager.Service.IncomingMessage;
                actor: string;
                realm: string;
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
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
            type Props<T extends HRRequestType = HRRequestType> = {
                input: {
                    payloadSchemaVersion: number;
                    initiatorEmployee?: string;
                    relatedRequest?: string;
                    targetPosition?: string;
                    idempotencyKey: string;
                    payload: Entities.HRRequest.Payload.ByType[T];
                    type: T;
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
                    type: HRRequestType;
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
