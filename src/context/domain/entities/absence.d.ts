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
                cancel(props: Cancel.Props): void;
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
