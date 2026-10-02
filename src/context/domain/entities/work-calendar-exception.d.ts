import { DayOverride } from "~context/enums";

declare global {
    namespace Entities {
        type WorkCalendarException = WorkCalendarException.Contract;

        namespace WorkCalendarException {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                workdayOverride?: DayOverride;
                shortenedByMinutes?: number;
                holidayOverride?: boolean;
                organization: string;
                source?: string;
                name?: string;
                date: string;

                calendar: Entities.WorkCalendar;

                update(props: ChangeDataProps): void;
                canCreate(): void;
            }

            type MutableFields = Pick<
                Contract,
                "date" | "name" | "holidayOverride" | "workdayOverride" | "shortenedByMinutes" | "source"
            >;

            type ConstructorProps = {
                date: string;
                name?: string;
                holidayOverride?: boolean;
                workdayOverride?: DayOverride;
                shortenedByMinutes?: number;
                source?: string;
                organization: string;

                calendar: Entities.WorkCalendar;
            };

            type ChangeDataProps = {
                patch: Partial<MutableFields>;
            };
        }
    }
}
