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

describe("[Entity] - LeaveLedgerEntry", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createLeaveLedgerEntry();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
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

            // Act
            const entity = createLeaveLedgerEntry(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("[Method] - canCreate", () => {
        it("[case] - accepts an entry without optional relations", () => {
            // Arrange

            // Act
            const act = (): unknown => createLeaveLedgerEntry().canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it.each(["employee", "leavePolicy", "sourceRequest", "absence", "reversesEntry"] as const)(
            "[case] - rejects a foreign %s",
            (field) => {
                // Arrange
                const entity = createLeaveLedgerEntry();
                Object.assign(entity, { [field]: { organization: { id: "other" } } });

                // Act
                const act = (): unknown => entity.canCreate();

                // Assert
                expect(act).toThrow("ORGANIZATION_MISMATCH");
            },
        );
        it("[case] - validates the source request employee", () => {
            // Arrange

            // Act
            const act = (): unknown => createLeaveLedgerEntry({ sourceRequest: stubRequest() }).canCreate();
            const act1 = (): unknown =>
                createLeaveLedgerEntry({
                    sourceRequest: stubRequest({ employee: stubEmployee({ id: "other" }) }),
                }).canCreate();

            // Assert
            expect(act).not.toThrow();
            expect(act1).toThrow("REQUEST_MISMATCH");
        });

        it.each([
            { field: "absence", reason: "employee" },
            { field: "absence", reason: "pool" },
            { field: "absence", reason: "unit" },
            { field: "reversesEntry", reason: "employee" },
            { field: "reversesEntry", reason: "pool" },
            { field: "reversesEntry", reason: "unit" },
        ] as const)("[case] - rejects a mismatched $reason in $field", ({ field, reason }) => {
            // Arrange
            const patches = {
                employee: { employee: stubEmployee({ id: "other" }) },
                pool: { poolCode: "other" },
                unit: { unit: LeaveUnit.MINUTE },
            };
            const entity = createLeaveLedgerEntry();
            Object.assign(entity, {
                [field]: {
                    organization,
                    employee: stubEmployee(),
                    poolCode: "annual",
                    unit: LeaveUnit.DAY,
                    ...patches[reason],
                },
            });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("POOL_MISMATCH");
        });

        it("[case] - accepts a matching absence", () => {
            // Arrange
            const absence = {
                organization,
                employee: stubEmployee(),
                poolCode: "annual",
                unit: LeaveUnit.DAY,
            } as Entities.Absence;

            // Act
            const act = (): unknown => createLeaveLedgerEntry({ absence }).canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it("[case] - rejects an unknown pool and a mismatched unit", () => {
            // Arrange

            // Act
            const act = (): unknown => createLeaveLedgerEntry({ poolCode: "other" }).canCreate();
            const act1 = (): unknown => createLeaveLedgerEntry({ unit: LeaveUnit.MINUTE }).canCreate();

            // Assert
            expect(act).toThrow("INVALID_POOL");
            expect(act1).toThrow("INVALID_POOL");
        });
    });

    describe("[Behavior] - reversal", () => {
        it.each([
            ["1.25", "-1.250000", "-0.5", "0.500000"],
            ["0.000001", "-0.000001", "0", "0.000000"],
            ["9007199254740993.123456", "-9007199254740993.123456", "0.000001", "-0.000001"],
        ])("[case] - reverses exact decimal deltas %s and %s", (balance, reversedBalance, reserved, reversedReserved) => {
            // Arrange
            const original = createLeaveLedgerEntry({ balanceDelta: balance, reservedDelta: reserved });

            // Act
            const reversal = createLeaveLedgerEntry({
                kind: LeaveLedgerKind.REVERSAL,
                balanceDelta: reversedBalance,
                reservedDelta: reversedReserved,
                reversesEntry: original,
            });
            const act = (): unknown => reversal.canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it.each(["balanceDelta", "reservedDelta"] as const)("[case] - rejects a non-opposite %s", (field) => {
            // Arrange
            const original = createLeaveLedgerEntry({ balanceDelta: "1.25", reservedDelta: "0.5" });
            const entity = createLeaveLedgerEntry({
                balanceDelta: "-1.25",
                reservedDelta: "-0.5",
                reversesEntry: original,
                [field]: "0",
            });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("INVALID_REVERSAL");
        });

        it("[case] - rejects a self-reversal even with zero deltas", () => {
            // Arrange
            const entity = createLeaveLedgerEntry();
            entity.reversesEntry = entity;

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("INVALID_REVERSAL");
        });
    });
});
