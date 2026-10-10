import { CalendarApplication, SchedulePattern, RecordStatus } from "~context/enums";

declare global {
    namespace Entities {
        type WorkSchedule = WorkSchedule.Contract;

        namespace WorkSchedule {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                calendarApplication: CalendarApplication;
                patternType: SchedulePattern;
                status: RecordStatus;
                pattern: Pattern;
                revision: number;
                code: string;
                name: string;

                organization: Entities.Organization;

                employmentHistory: ORM.Collection<Entities.Employment>;
                employees: ORM.Collection<Entities.Employee>;

                createRevision(props: CreateRevision.Props): Entities.WorkSchedule;
                canPurge(): void;
                archive(): void;
                restore(): void;
            }

            type ConstructorProps = {
                code: string;
                name: string;
                revision?: number;
                status?: RecordStatus;
                patternType: SchedulePattern;
                pattern: Pattern;
                calendarApplication: CalendarApplication;

                organization: Entities.Organization;
            };

            type Pattern = Pattern.Weekly | Pattern.Cyclic;

            namespace Pattern {
                type Weekly = {
                    schemaVersion: 1;
                    week: Record<Weekday, Day>;
                    transferredWorkday?: Day;
                };

                type Cyclic = {
                    schemaVersion: 1;
                    cycle: Day[];
                    transferredWorkday?: Day;
                };

                type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

                type Day = {
                    intervals: Interval[];
                };

                type Interval = {
                    start: string;
                    end: string;
                    endDayOffset: 0 | 1;
                };
            }

            namespace CreateRevision {
                type Props = Partial<Pick<Contract, "name" | "patternType" | "pattern" | "calendarApplication">>;
            }
        }
    }
}
