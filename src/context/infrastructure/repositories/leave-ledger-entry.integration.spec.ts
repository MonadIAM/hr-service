import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { LeaveLedgerKind, LeaveUnit } from "~context/enums";

import { LeaveLedgerEntryRepository } from "./leave-ledger-entry.repository";

describe("[Repository] - LeaveLedgerEntry", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new LeaveLedgerEntryRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - loads persisted fields and relations through the schema", async () => {
            // Arrange
            const entity = await suite.fixtures().createLeaveLedgerEntry();

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            // Assert
            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                kind: LeaveLedgerKind.ACCRUAL,
                unit: LeaveUnit.DAY,
                poolCode: "ANNUAL",
                balanceDelta: "2.500000",
                reservedDelta: "0.000000",
                effectiveOn: "2026-01-01",
                calculationSnapshot: { months: 1 },
                idempotencyKey: entity.idempotencyKey,
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
            expect(loaded.employee.id).toBe(entity.employee.id);
            expect(loaded.leavePolicy.id).toBe(entity.leavePolicy.id);
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - filters by organization and kind", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createLeaveLedgerEntry({ organization });
            await suite.fixtures().createLeaveLedgerEntry({ organization, kind: LeaveLedgerKind.ADJUSTMENT });
            await suite.fixtures().createLeaveLedgerEntry({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    kind: { operator: PublicStringOperator.EQUAL, value: LeaveLedgerKind.ACCRUAL },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by organization and balanceDelta", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createLeaveLedgerEntry({ organization });
            await suite.fixtures().createLeaveLedgerEntry({ organization, balanceDelta: "1.000000" });
            await suite.fixtures().createLeaveLedgerEntry({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    balanceDelta: { operator: PublicOrdinalOperator.EQUAL, value: "2.5" },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by the employee relation", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createLeaveLedgerEntry({ organization });
            await suite.fixtures().createLeaveLedgerEntry({ organization });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { employee: { operator: PublicLinkOperator.EQUAL, value: matched.employee.id } },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by the leavePolicy relation", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createLeaveLedgerEntry({ organization });
            await suite.fixtures().createLeaveLedgerEntry({ organization });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { leavePolicy: { operator: PublicLinkOperator.EQUAL, value: matched.leavePolicy.id } },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - sorts and paginates while preserving the total count", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createLeaveLedgerEntry({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createLeaveLedgerEntry({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createLeaveLedgerEntry({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 2, elementsPerPage: 2 },
                sort: { createdAt: QueryOrder.DESC },
                filters: { organization: { operator: PublicLinkOperator.EQUAL, value: organization.id } },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(3);
            expect(result1).toEqual([first.id]);
        });
    });
});
