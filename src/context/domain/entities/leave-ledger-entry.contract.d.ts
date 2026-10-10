import { LeaveLedgerKind, LeaveUnit } from "~context/enums";

declare global {
    namespace Entities {
        type LeaveLedgerEntry = LeaveLedgerEntry.Contract;

        namespace LeaveLedgerEntry {
            interface Contract {
                id: string;
                createdAt: Date;

                calculationSnapshot: UnknownObject;
                entitlementPeriodStart?: string;
                entitlementPeriodEnd?: string;
                idempotencyKey: string;
                kind: LeaveLedgerKind;
                reservedDelta: string;
                balanceDelta: string;
                effectiveOn: string;
                poolCode: string;
                unit: LeaveUnit;
                reason: string;

                reversedByEntry?: Entities.LeaveLedgerEntry;
                reversesEntry?: Entities.LeaveLedgerEntry;
                organization: Entities.Organization;
                sourceRequest?: Entities.HRRequest;
                leavePolicy: Entities.LeavePolicy;
                employee: Entities.Employee;
                absence?: Entities.Absence;

                canCreate(): void;
            }

            type ConstructorProps = {
                calculationSnapshot: UnknownObject;
                entitlementPeriodStart?: string;
                entitlementPeriodEnd?: string;
                idempotencyKey: string;
                kind: LeaveLedgerKind;
                reservedDelta: string;
                balanceDelta: string;
                effectiveOn: string;
                poolCode: string;
                unit: LeaveUnit;
                reason: string;

                reversesEntry?: Entities.LeaveLedgerEntry;
                organization: Entities.Organization;
                sourceRequest?: Entities.HRRequest;
                leavePolicy: Entities.LeavePolicy;
                employee: Entities.Employee;
                absence?: Entities.Absence;
            };
        }
    }
}
