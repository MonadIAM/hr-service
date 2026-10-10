import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { LeaveLedgerKind, LeaveUnit } from "~context/enums";

import { LeaveLedgerEntryRepository } from "./leave-ledger-entry.repository";

describe("LeaveLedgerEntryRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new LeaveLedgerEntryRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createLeaveLedgerEntry();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

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

    describe("findMany", () => {
        it("filters by organization and kind", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createLeaveLedgerEntry({ organization });
            await suite.fixtures().createLeaveLedgerEntry({ organization, kind: LeaveLedgerKind.ADJUSTMENT });
            await suite.fixtures().createLeaveLedgerEntry({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    kind: { operator: PublicStringOperator.EQUAL, value: LeaveLedgerKind.ACCRUAL },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and balanceDelta", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createLeaveLedgerEntry({ organization });
            await suite.fixtures().createLeaveLedgerEntry({ organization, balanceDelta: "1.000000" });
            await suite.fixtures().createLeaveLedgerEntry({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    balanceDelta: { operator: PublicOrdinalOperator.EQUAL, value: "2.5" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the employee relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createLeaveLedgerEntry({ organization });
            await suite.fixtures().createLeaveLedgerEntry({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { employee: { operator: PublicLinkOperator.EQUAL, value: matched.employee.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the leavePolicy relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createLeaveLedgerEntry({ organization });
            await suite.fixtures().createLeaveLedgerEntry({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { leavePolicy: { operator: PublicLinkOperator.EQUAL, value: matched.leavePolicy.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createLeaveLedgerEntry({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createLeaveLedgerEntry({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createLeaveLedgerEntry({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 2, elementsPerPage: 2 },
                sort: { createdAt: QueryOrder.DESC },
                filters: { organization: { operator: PublicLinkOperator.EQUAL, value: organization.id } },
            });

            expect(total).toBe(3);
            expect(entries.map(({ id }) => id)).toEqual([first.id]);
        });
    });
});
