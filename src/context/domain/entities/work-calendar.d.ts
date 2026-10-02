import { RecordStatus } from "~context/enums";

declare global {
    namespace Entities {
        type WorkCalendar = WorkCalendar.Contract;

        namespace WorkCalendar {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                verifiedThrough?: string;
                organization: string;
                status: RecordStatus;
                countryCode: string;
                regionCode?: string;
                holidays: Holiday[];
                code: string;
                name: string;

                exceptions: ORM.Collection<Entities.WorkCalendarException>;
                employmentHistory: ORM.Collection<Entities.Employment>;
                employees: ORM.Collection<Entities.Employee>;

                update(props: ChangeDataProps): void;
                canPurge(): void;
                archive(): void;
                restore(): void;
            }

            type MutableFields = Pick<
                Contract,
                "code" | "name" | "countryCode" | "regionCode" | "holidays" | "verifiedThrough"
            >;

            type ConstructorProps = {
                verifiedThrough?: string;
                organization: string;
                status: RecordStatus;
                countryCode: string;
                regionCode?: string;
                holidays: Holiday[];
                code: string;
                name: string;
            };

            type Holiday = {
                code: string;
                name: string;

                isPublicHoliday: boolean;

                effectiveFrom: string;
                effectiveTo: Nullable<string>;

                periods: Holiday.Period[];
            };

            namespace Holiday {
                type Period = {
                    from: string;
                    through: string;
                };
            }

            type ChangeDataProps = {
                patch: Partial<MutableFields>;
            };
        }
    }
}
