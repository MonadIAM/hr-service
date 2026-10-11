import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { LeaveLedgerEntryIntegrationHelpers } from "~testing/integration/domain-service/leave-ledger-entry.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { LeaveLedgerEntry } from "~context/domain/entities";
import { LeaveLedgerKind } from "~context/enums";

const helpers = new LeaveLedgerEntryIntegrationHelpers();

describe("[DomainService] - LeaveLedgerEntry", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - reverse", () => {
        it("[case] - persists exact opposite deltas and prevents duplicate reversals", async () => {
            // Arrange
            const entry = await suite
                .fixtures()
                .createLeaveLedgerEntry({ balanceDelta: "2.500001", reservedDelta: "-1.000001" });
            const input = { reason: "Correction", effectiveOn: "2026-02-01", idempotencyKey: randomUUID() };

            // Act
            const reversed = await suite.transaction((transaction) =>
                suite
                    .repository()
                    .service.reverse({ organization: entry.organization.id, id: entry.id, input, transaction }),
            );
            const duplicate = suite.transaction((transaction) =>
                suite.repository().service.reverse({
                    organization: entry.organization.id,
                    id: entry.id,
                    input: { ...input, idempotencyKey: randomUUID() },
                    transaction,
                }),
            );

            // Assert
            await expect(duplicate).rejects.toThrow("services.leave-ledger-entry.INVALID_REVERSAL");
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(LeaveLedgerEntry, { id: reversed.id }, { populate: ["reversesEntry"] }),
            );
            expect(persisted).toMatchObject({
                kind: LeaveLedgerKind.REVERSAL,
                balanceDelta: "-2.500001",
                reservedDelta: "1.000001",
            });
            expect(persisted.reversesEntry?.id).toBe(entry.id);
            expect(await suite.transaction((transaction) => transaction.count(LeaveLedgerEntry, {}))).toBe(2);
        });

        it("[case] - rolls back reversal links when the idempotency key conflicts", async () => {
            // Arrange
            const entry = await suite.fixtures().createLeaveLedgerEntry();

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.reverse({
                    organization: entry.organization.id,
                    id: entry.id,
                    input: { reason: "Duplicate", effectiveOn: "2026-02-01", idempotencyKey: entry.idempotencyKey },
                    transaction,
                }),
            );

            // Assert
            await expect(result).rejects.toThrow();
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(LeaveLedgerEntry, { id: entry.id }, { populate: ["reversedByEntry"] }),
            );
            expect(persisted.reversedByEntry).toBeFalsy();
            expect(await suite.transaction((transaction) => transaction.count(LeaveLedgerEntry, {}))).toBe(1);
        });
    });

    describe("[Method] - create", () => {
        it("[case] - persists accrual entries and enforces organization idempotency", async () => {
            // Arrange
            const entry = await suite.fixtures().createLeaveLedgerEntry();
            const input = { ...entry, idempotencyKey: randomUUID() };

            // Act
            const created = await suite.transaction((transaction) =>
                suite.repository().service.create({ organization: entry.organization.id, input, transaction }),
            );
            const duplicate = suite.transaction((transaction) =>
                suite.repository().service.create({ organization: entry.organization.id, input, transaction }),
            );

            // Assert
            await expect(duplicate).rejects.toThrow();
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(LeaveLedgerEntry, { id: created.id }),
            );
            expect(persisted.balanceDelta).toBe(entry.balanceDelta);
            expect(await suite.transaction((transaction) => transaction.count(LeaveLedgerEntry, {}))).toBe(2);
        });
    });
});
