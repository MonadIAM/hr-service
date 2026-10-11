import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { LeaveLedgerEntryUnitHelpers } from "~testing/unit/domain-service/leave-ledger-entry.helpers";
import { LeaveLedgerKind } from "~context/enums";

const helpers = new LeaveLedgerEntryUnitHelpers();

describe("[DomainService] - LeaveLedgerEntry", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it.each([LeaveLedgerKind.ACCRUAL, LeaveLedgerKind.REVERSAL])(
            "[case] - enforces creation rules for %s",
            async (kind) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const input = helpers.createLeaveLedgerEntry({ kind });
                repositories.organization.findUniqueOrThrow.mockResolvedValue(input.organization);

                // Act
                const result = service.create({
                    organization: input.organization.id,
                    input,
                    transaction: transaction.entityManager,
                });

                // Assert
                if (kind === LeaveLedgerKind.REVERSAL) {
                    await expect(result).rejects.toThrow("services.leave-ledger-entry.INVALID_REVERSAL");
                    expect(transaction.persist).not.toHaveBeenCalled();
                    expect(repositories.organization.findUniqueOrThrow).not.toHaveBeenCalled();
                } else {
                    expect(await result).toMatchObject({
                        kind,
                        employee: input.employee,
                        balanceDelta: input.balanceDelta,
                    });
                    expect(transaction.persist).toHaveBeenCalledWith(await result);
                }
            },
        );
    });

    describe("[Method] - reverse", () => {
        it.each([
            ["2.500001", "-1.000001", "-2.500001", "1.000001"],
            ["0", "-0.000000", "0", "0"],
            ["-999999999999.123456", "0.000000", "999999999999.123456", "0"],
        ])("[case] - reverses exact decimal deltas %s and %s", async (balanceDelta, reservedDelta, balance, reserved) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createLeaveLedgerEntry({ balanceDelta, reservedDelta });
            repositories.organization.findUniqueOrThrow.mockResolvedValue(entity.organization);
            repositories.leaveLedgerEntry.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = await service.reverse({
                organization: entity.organization.id,
                id: entity.id,
                transaction: transaction.entityManager,
                input: { reason: "Correction", effectiveOn: "2026-02-01", idempotencyKey: "reversal" },
            });

            // Assert
            expect(result).toMatchObject({
                kind: LeaveLedgerKind.REVERSAL,
                balanceDelta: balance,
                reservedDelta: reserved,
                reversesEntry: entity,
                employee: entity.employee,
                leavePolicy: entity.leavePolicy,
                calculationSnapshot: { reversedEntry: entity.id },
            });
            expect(entity.reversedByEntry).toBe(result);
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });

        it.each(["reversal", "reversed"])("[case] - rejects an entry that is already %s", async (state) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createLeaveLedgerEntry();
            if (state === "reversal") {
                entity.kind = LeaveLedgerKind.REVERSAL;
            } else {
                entity.reversedByEntry = helpers.createLeaveLedgerEntry();
            }
            repositories.organization.findUniqueOrThrow.mockResolvedValue(entity.organization);
            repositories.leaveLedgerEntry.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = service.reverse({
                organization: entity.organization.id,
                id: entity.id,
                transaction: transaction.entityManager,
                input: { reason: "Correction", effectiveOn: "2026-02-01", idempotencyKey: "reversal" },
            });

            // Assert
            await expect(result).rejects.toThrow("services.leave-ledger-entry.INVALID_REVERSAL");
            expect(transaction.persist).not.toHaveBeenCalled();
        });
    });
});
