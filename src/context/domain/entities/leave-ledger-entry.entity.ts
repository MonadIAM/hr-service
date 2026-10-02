import { randomUUID } from "node:crypto";

import { LeaveLedgerKind, LeaveUnit } from "~context/enums";
import { Exception } from "~common/exceptions";

export class LeaveLedgerEntry implements Entities.LeaveLedgerEntry.Contract {
    private static readonly dictionaryPath = "entities.leave-ledger-entry";

    public id: string;
    public createdAt: Date;

    public calculationSnapshot: UnknownObject;
    public entitlementPeriodStart?: string;
    public entitlementPeriodEnd?: string;
    public idempotencyKey: string;
    public kind: LeaveLedgerKind;
    public reservedDelta: string;
    public organization: string;
    public balanceDelta: string;
    public effectiveOn: string;
    public poolCode: string;
    public unit: LeaveUnit;
    public reason: string;

    public reversedByEntry?: Entities.LeaveLedgerEntry;
    public reversesEntry?: Entities.LeaveLedgerEntry;
    public sourceRequest?: Entities.HRRequest;
    public leavePolicy: Entities.LeavePolicy;
    public employee: Entities.Employee;
    public absence?: Entities.Absence;

    public constructor(props: Entities.LeaveLedgerEntry.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.calculationSnapshot = props.calculationSnapshot ?? {};
        this.reservedDelta = props.reservedDelta ?? "0";
        this.balanceDelta = props.balanceDelta ?? "0";

        this.entitlementPeriodStart = props.entitlementPeriodStart;
        this.entitlementPeriodEnd = props.entitlementPeriodEnd;
        this.idempotencyKey = props.idempotencyKey;
        this.organization = props.organization;
        this.effectiveOn = props.effectiveOn;
        this.poolCode = props.poolCode;
        this.reason = props.reason;
        this.unit = props.unit;
        this.kind = props.kind;

        this.sourceRequest = props.sourceRequest;
        this.reversesEntry = props.reversesEntry;
        this.leavePolicy = props.leavePolicy;
        this.employee = props.employee;
        this.absence = props.absence;
    }

    public canCreate(): void {
        if (this.hasOrganizationMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${LeaveLedgerEntry.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.sourceRequest && this.sourceRequest.employee.id !== this.employee.id) {
            throw Exception.invariantViolation({ messageKey: `${LeaveLedgerEntry.dictionaryPath}.REQUEST_MISMATCH` });
        } else if (this.hasPoolMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${LeaveLedgerEntry.dictionaryPath}.POOL_MISMATCH` });
        } else if (!this.leavePolicy.rules.some((rule) => rule.poolCode === this.poolCode && rule.unit === this.unit)) {
            throw Exception.invariantViolation({ messageKey: `${LeaveLedgerEntry.dictionaryPath}.INVALID_POOL` });
        } else if (this.reversesEntry) {
            const [balance, reserved, reversedBalance, reversedReserved] = [
                this.balanceDelta,
                this.reservedDelta,
                this.reversesEntry.balanceDelta,
                this.reversesEntry.reservedDelta,
            ].map((value) => {
                const [whole, fraction = ""] = value.replace("-", "").split(".");
                return (value.startsWith("-") ? -1n : 1n) * BigInt(whole + fraction.padEnd(6, "0"));
            });

            if (this.reversesEntry.id === this.id || balance !== -reversedBalance || reserved !== -reversedReserved) {
                throw Exception.invariantViolation({ messageKey: `${LeaveLedgerEntry.dictionaryPath}.INVALID_REVERSAL` });
            }
        }
    }

    private hasOrganizationMismatch(): boolean {
        return [this.employee, this.leavePolicy, this.sourceRequest, this.absence, this.reversesEntry].some(
            (record) => record && record.organization !== this.organization,
        );
    }

    private hasPoolMismatch(): boolean {
        return [this.absence, this.reversesEntry].some(
            (record) =>
                record &&
                (record.employee.id !== this.employee.id || record.poolCode !== this.poolCode || record.unit !== this.unit),
        );
    }
}
