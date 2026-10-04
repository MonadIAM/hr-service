import { EmployeeStatus } from "~context/enums";

declare global {
    namespace Entities {
        type Employee = Employee.Contract;

        namespace Employee {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                employmentStartedOn?: string;
                scheduleAnchorDate?: string;
                employmentEndedOn?: string;
                scheduleTimezone?: string;
                termsValidFrom?: string;
                contractEndsOn?: string;
                status: EmployeeStatus;
                employeeNumber: string;
                contractType?: string;
                termsRevision: number;
                middleName?: string;
                workEmail?: string;
                firstName: string;
                lastName: string;
                account?: string;

                workCalendar?: Entities.WorkCalendar;
                workSchedule?: Entities.WorkSchedule;
                organization: Entities.Organization;
                leavePolicy?: Entities.LeavePolicy;
                hrBpEmployee?: Entities.Employee;

                positionAssignments: ORM.Collection<Entities.PositionAssignment>;
                assignedApprovalSteps: ORM.Collection<Entities.HRApprovalStep>;
                approvalDecisions: ORM.Collection<Entities.HRApprovalDecision>;
                leaveLedgerEntries: ORM.Collection<Entities.LeaveLedgerEntry>;
                initiatedHRRequests: ORM.Collection<Entities.HRRequest>;
                employmentHistory: ORM.Collection<Entities.Employment>;
                employeesAsHRBP: ORM.Collection<Entities.Employee>;
                hrRequests: ORM.Collection<Entities.HRRequest>;
                absences: ORM.Collection<Entities.Absence>;

                linkAccount(props: LinkAccount.Props): void;
                changeTerms(props: ChangeTerms.Props): void;
                terminate(props: Terminate.Props): void;
                update(props: ChangeDataProps): void;
                setHRBP(props: SetHRBP.Props): void;
                hire(props: Hire.Props): void;
                unlinkAccount(): void;
                canCreate(): void;
                archive(): void;
                restore(): void;
            }

            type MutableFields = Pick<Contract, "employeeNumber" | "firstName" | "lastName" | "middleName" | "workEmail">;

            type ConstructorProps = {
                employmentStartedOn?: string;
                scheduleAnchorDate?: string;
                employmentEndedOn?: string;
                scheduleTimezone?: string;
                termsValidFrom?: string;
                contractEndsOn?: string;
                status: EmployeeStatus;
                employeeNumber: string;
                contractType?: string;
                termsRevision: number;
                middleName?: string;
                workEmail?: string;
                firstName: string;
                lastName: string;
                account?: string;

                workCalendar?: Entities.WorkCalendar;
                workSchedule?: Entities.WorkSchedule;
                organization: Entities.Organization;
                leavePolicy?: Entities.LeavePolicy;
                hrBpEmployee?: Entities.Employee;
            };

            type ChangeDataProps = {
                patch: Partial<MutableFields>;
            };

            namespace LinkAccount {
                type Props = {
                    account: string;
                };
            }

            namespace SetHRBP {
                type Props = {
                    employee?: Entities.Employee;
                };
            }

            namespace ChangeTerms {
                type Props = {
                    scheduleTimezone: string;
                    termsValidFrom: string;
                    scheduleAnchorDate?: string;
                    contractEndsOn?: string;
                    contractType?: string;

                    workCalendar: Entities.WorkCalendar;
                    workSchedule: Entities.WorkSchedule;
                    leavePolicy: Entities.LeavePolicy;
                };
            }

            namespace Hire {
                type Props = ChangeTerms.Props & {
                    employmentStartedOn: string;
                };
            }

            namespace Terminate {
                type Props = {
                    employmentEndedOn: string;
                };
            }
        }
    }
}
