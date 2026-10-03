import { CalendarApplication, SchedulePattern } from "~context/enums";

declare global {
    namespace Commands.WorkSchedule {
        interface Contract extends ControllerContract {}

        interface ControllerContract {
            createRevision: CreateRevision.Signature;
            archive: Archive.Signature;
            restore: Restore.Signature;
            create: Create.Signature;
            purge: Purge.Signature;
        }

        namespace Create {
            type Props = {
                organization: string;
                actor: string;
                realm: string;
                input: {
                    calendarApplication: CalendarApplication;
                    pattern: Entities.WorkSchedule.Pattern;
                    patternType: SchedulePattern;
                    code: string;
                    name: string;
                };
                context: Extract.Meta;
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }

        namespace CreateRevision {
            type Props = {
                id: string;
                organization: string;
                actor: string;
                realm: string;
                input: Entities.WorkSchedule.CreateRevision.Props;
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
