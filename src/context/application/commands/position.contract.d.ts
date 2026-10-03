import { PayPeriod } from "~context/enums";

declare global {
    namespace Commands.Position {
        interface Contract extends ControllerContract {}

        interface ControllerContract {
            archive: Archive.Signature;
            restore: Restore.Signature;
            create: Create.Signature;
            update: Update.Signature;
            purge: Purge.Signature;
        }

        namespace Create {
            type Props = {
                organization: string;
                actor: string;
                realm: string;
                input: {
                    budgetPeriod?: PayPeriod;
                    budgetCurrency?: string;
                    budgetAmount?: string;
                    requirements?: string;
                    description?: string;
                    department: string;
                    plannedFte: string;
                    grade?: string;
                    title: string;
                    team?: string;
                    code: string;
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
                    patch: Partial<Entities.Position.MutableFields>;
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

        namespace Purge {
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
