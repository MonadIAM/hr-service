import { DayOverride } from "~context/enums";

declare global {
    namespace Commands.WorkCalendarException {
        interface Contract extends ControllerContract {}

        interface ControllerContract {
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
                    workdayOverride?: DayOverride;
                    shortenedByMinutes?: number;
                    holidayOverride?: boolean;
                    calendar: string;
                    source?: string;
                    name?: string;
                    date: string;
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
                    patch: Partial<Entities.WorkCalendarException.MutableFields>;
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
