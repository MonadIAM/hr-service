import { RecordStatus } from "~context/enums";

declare global {
    namespace Entities {
        type LeavePolicy = LeavePolicy.Contract;

        namespace LeavePolicy {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                status: RecordStatus;
                jurisdiction: string;
                organization: string;
                revision: number;
                rules: Rule[];
                code: string;
                name: string;

                leaveLedgerEntries: ORM.Collection<Entities.LeaveLedgerEntry>;
                employmentHistory: ORM.Collection<Entities.Employment>;
                employees: ORM.Collection<Entities.Employee>;
                absences: ORM.Collection<Entities.Absence>;

                createRevision(props: CreateRevision.Props): Entities.LeavePolicy;
                canPurge(): void;
                archive(): void;
                restore(): void;
            }

            type ConstructorProps = {
                code: string;
                name: string;
                revision?: number;
                status?: RecordStatus;
                jurisdiction: string;
                rules: Rule[];
                organization: string;
            };

            type Rule = {
                poolCode: string;
                unit: "DAY" | "MINUTE";
                annualEntitlement?: string;

                accrualBasis: "SERVICE_MONTHS" | "LEGAL_RULE" | "APPROVED_OVERTIME_REQUEST" | "NONE";
                legalRuleCode?: string;

                dayCounting: "CALENDAR_EXCLUDING_PUBLIC_HOLIDAYS" | "SCHEDULED_MINUTES" | "CALENDAR_DAYS";
                availability: "STATUTORY_ENTITLEMENT_WITH_ADVANCE" | "BALANCE" | "APPROVAL_ONLY" | "SUPPORTING_DOCUMENT";
                expiration: null;
            };

            namespace CreateRevision {
                type Props = Partial<Pick<Contract, "name" | "jurisdiction" | "rules">>;
            }
        }
    }
}
