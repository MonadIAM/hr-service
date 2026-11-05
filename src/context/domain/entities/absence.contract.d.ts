import { DateTime } from "luxon";

import { AbsenceStatus, LeaveUnit } from "~context/enums";

declare global {
    namespace Entities {
        type Absence = Absence.Contract;

        namespace Absence {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                calculationSnapshot: UnknownObject;
                status: AbsenceStatus;
                sourceItemKey: string;
                startDate?: string;
                poolCode: string;
                quantity: string;
                timezone: string;
                endDate?: string;
                unit: LeaveUnit;
                startsAt?: Date;
                endsAt?: Date;

                cancelledByRequest?: Entities.HRRequest;
                organization: Entities.Organization;
                leavePolicy: Entities.LeavePolicy;
                sourceRequest: Entities.HRRequest;
                employee: Entities.Employee;

                leaveLedgerEntries: ORM.Collection<Entities.LeaveLedgerEntry>;

                advanceStatus(props: AdvanceStatus.Props): void;
                calculate(props: Calculate.Props): void;
                cancel(props: Cancel.Props): void;
                period(): Period.Result;
                canCreate(): void;
            }

            type ConstructorProps = {
                calculationSnapshot: UnknownObject;
                status: AbsenceStatus;
                sourceItemKey: string;
                startDate?: string;
                poolCode: string;
                quantity: string;
                timezone: string;
                endDate?: string;
                unit: LeaveUnit;
                startsAt?: Date;
                endsAt?: Date;

                cancelledByRequest?: Entities.HRRequest;
                organization: Entities.Organization;
                leavePolicy: Entities.LeavePolicy;
                sourceRequest: Entities.HRRequest;
                employee: Entities.Employee;
            };

            namespace Period {
                type Result = [Date, Date];
            }

            namespace Calculate {
                type Props = {
                    exceptions: Entities.WorkCalendarException[];
                };
            }

            namespace CanCalculate {
                type Props = {
                    rule: Entities.LeavePolicy.Rule;
                    startDate: string;
                    lastDate: string;
                };
            }

            namespace CalculateDays {
                type Props = {
                    exceptions: Entities.WorkCalendarException[];
                    rule: Entities.LeavePolicy.Rule;
                };
            }

            namespace CalculateMinutes {
                type Props = {
                    exceptions: Entities.WorkCalendarException[];
                    startDate: string;
                    lastDate: string;
                };
            }

            namespace WorkIntervals {
                type Props = {
                    exception?: Entities.WorkCalendarException;
                    anchor?: DateTime;
                    day: DateTime;
                };

                type Result = Entities.WorkSchedule.Pattern.Interval[];
            }

            namespace AdvanceStatus {
                type Props = {
                    at: Date;
                };
            }

            namespace Cancel {
                type Props = {
                    request: Entities.HRRequest;
                };
            }
        }
    }
}
