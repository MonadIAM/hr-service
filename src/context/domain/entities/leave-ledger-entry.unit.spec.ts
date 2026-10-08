import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { LeaveLedgerKind, LeaveUnit } from "~context/enums";

import { LeaveLedgerEntry } from "./leave-ledger-entry.entity";

const organization = { id: "organization", realm: "realm" };

function stubEmployee(overrides?: Partial<Entities.Employee>): Entities.Employee {
    return { id: "employee", organization, ...overrides } as Entities.Employee;
}

function stubRequest(overrides?: Partial<Entities.HRRequest>): Entities.HRRequest {
    return { id: "request", organization, employee: stubEmployee(), ...overrides } as Entities.HRRequest;
}

function stubPolicy(): Entities.LeavePolicy {
    return { organization, rules: [{ poolCode: "annual", unit: LeaveUnit.DAY }] } as Entities.LeavePolicy;
}

function createLeaveLedgerEntry(overrides?: Partial<Entities.LeaveLedgerEntry.ConstructorProps>): LeaveLedgerEntry {
    return new LeaveLedgerEntry({
        organization,
        employee: stubEmployee(),
        leavePolicy: stubPolicy(),
        poolCode: "annual",
        unit: LeaveUnit.DAY,
        kind: LeaveLedgerKind.ACCRUAL,
        effectiveOn: "2026-01-01",
        reason: "Annual accrual",
        idempotencyKey: "accrual-001",
        balanceDelta: "0",
        reservedDelta: "0",
        calculationSnapshot: {},
        ...overrides,
    });
}

describe("LeaveLedgerEntry Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createLeaveLedgerEntry();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
        });

        it("should assign supplied fields and relations", () => {
            const props: Partial<Entities.LeaveLedgerEntry.ConstructorProps> = {
                kind: LeaveLedgerKind.REVERSAL,
                balanceDelta: "-1.25",
                reservedDelta: "0.5",
                calculationSnapshot: { rule: "annual" },
                entitlementPeriodStart: "2026-01-01",
                entitlementPeriodEnd: "2027-01-01",
                effectiveOn: "2026-10-01",
                idempotencyKey: "reversal-001",
                reason: "Correction",
                poolCode: "annual",
                unit: LeaveUnit.DAY,
                organization,
                employee: stubEmployee(),
                leavePolicy: stubPolicy(),
                sourceRequest: stubRequest(),
                absence: { organization } as Entities.Absence,
                reversesEntry: createLeaveLedgerEntry(),
            };
            const entity = createLeaveLedgerEntry(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("canCreate", () => {
        it("should accept an entry without optional relations", () => {
            expect(() => createLeaveLedgerEntry().canCreate()).not.toThrow();
        });

        it.each(["employee", "leavePolicy", "sourceRequest", "absence", "reversesEntry"] as const)(
            "should reject a foreign %s",
            (field) => {
                const entity = createLeaveLedgerEntry();
                Object.assign(entity, { [field]: { organization: { id: "other" } } });

                expect(() => entity.canCreate()).toThrow("ORGANIZATION_MISMATCH");
            },
        );
        it("should validate the source request employee", () => {
            expect(() => createLeaveLedgerEntry({ sourceRequest: stubRequest() }).canCreate()).not.toThrow();
            expect(() =>
                createLeaveLedgerEntry({
                    sourceRequest: stubRequest({ employee: stubEmployee({ id: "other" }) }),
                }).canCreate(),
            ).toThrow("REQUEST_MISMATCH");
        });

        it.each(["absence", "reversesEntry"] as const)("should validate the employee, pool and unit of %s", (field) => {
            for (const patch of [
                { employee: stubEmployee({ id: "other" }) },
                { poolCode: "other" },
                { unit: LeaveUnit.MINUTE },
            ]) {
                const entity = createLeaveLedgerEntry();
                Object.assign(entity, {
                    [field]: { organization, employee: stubEmployee(), poolCode: "annual", unit: LeaveUnit.DAY, ...patch },
                });

                expect(() => entity.canCreate()).toThrow("POOL_MISMATCH");
            }
        });

        it("should accept a matching absence", () => {
            const absence = {
                organization,
                employee: stubEmployee(),
                poolCode: "annual",
                unit: LeaveUnit.DAY,
            } as Entities.Absence;

            expect(() => createLeaveLedgerEntry({ absence }).canCreate()).not.toThrow();
        });

        it("should reject an unknown pool and a mismatched unit", () => {
            expect(() => createLeaveLedgerEntry({ poolCode: "other" }).canCreate()).toThrow("INVALID_POOL");
            expect(() => createLeaveLedgerEntry({ unit: LeaveUnit.MINUTE }).canCreate()).toThrow("INVALID_POOL");
        });
    });

    describe("reversal", () => {
        it.each([
            ["1.25", "-1.250000", "-0.5", "0.500000"],
            ["0.000001", "-0.000001", "0", "0.000000"],
            ["9007199254740993.123456", "-9007199254740993.123456", "0.000001", "-0.000001"],
        ])("should reverse exact decimal deltas %s and %s", (balance, reversedBalance, reserved, reversedReserved) => {
            const original = createLeaveLedgerEntry({ balanceDelta: balance, reservedDelta: reserved });
            const reversal = createLeaveLedgerEntry({
                kind: LeaveLedgerKind.REVERSAL,
                balanceDelta: reversedBalance,
                reservedDelta: reversedReserved,
                reversesEntry: original,
            });

            expect(() => reversal.canCreate()).not.toThrow();
        });

        it.each(["balanceDelta", "reservedDelta"] as const)("should reject a non-opposite %s", (field) => {
            const original = createLeaveLedgerEntry({ balanceDelta: "1.25", reservedDelta: "0.5" });
            const entity = createLeaveLedgerEntry({
                balanceDelta: "-1.25",
                reservedDelta: "-0.5",
                reversesEntry: original,
                [field]: "0",
            });

            expect(() => entity.canCreate()).toThrow("INVALID_REVERSAL");
        });

        it("should reject a self-reversal even with zero deltas", () => {
            const entity = createLeaveLedgerEntry();
            entity.reversesEntry = entity;

            expect(() => entity.canCreate()).toThrow("INVALID_REVERSAL");
        });
    });
});
