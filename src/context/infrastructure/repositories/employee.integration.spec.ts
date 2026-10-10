import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { EmployeeStatus } from "~context/enums";

import { EmployeeRepository } from "./employee.repository";

describe("EmployeeRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new EmployeeRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createEmployee();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                firstName: "Alice",
                lastName: "Morgan",
                employeeNumber: entity.employeeNumber,
                status: EmployeeStatus.DRAFT,
                termsRevision: 1,
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
        });
    });

    describe("findMany", () => {
        it("filters by organization and lastName", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createEmployee({ organization });
            await suite.fixtures().createEmployee({ organization, lastName: "Taylor" });
            await suite.fixtures().createEmployee({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    lastName: { operator: PublicStringOperator.ILIKE, value: "morg" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and status", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createEmployee({ organization });
            await suite.fixtures().createEmployee({ organization, status: EmployeeStatus.ARCHIVED });
            await suite.fixtures().createEmployee({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    status: { operator: PublicStringOperator.EQUAL, value: EmployeeStatus.DRAFT },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createEmployee({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createEmployee({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createEmployee({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 2, elementsPerPage: 2 },
                sort: { createdAt: QueryOrder.DESC },
                filters: { organization: { operator: PublicLinkOperator.EQUAL, value: organization.id } },
            });

            expect(total).toBe(3);
            expect(entries.map(({ id }) => id)).toEqual([first.id]);
        });
    });

    describe("getLookupList", () => {
        it.each([undefined, "Jane"])("searches the full name with middle name '%s'", async (middleName) => {
            const entity = await suite.fixtures().createEmployee({ middleName });
            const term = ["Morgan", "Alice", middleName].filter(Boolean).join(" ");

            const [entries, total] = await suite.repository().getLookupList({
                organization: entity.organization.id,
                realm: entity.organization.realm,
                pagination: { currentPage: 1, elementsPerPage: 10 },
                term,
            });

            expect(total).toBe(1);
            expect(entries[0]).toMatchObject({ id: entity.id, firstName: "Alice", lastName: "Morgan" });
            expect(entries[0]?.middleName ?? undefined).toBe(middleName);
        });

        it.each(["", "Morgan"])("requires matching organization and realm for term '%s'", async (term) => {
            const entity = await suite.fixtures().createEmployee();
            const other = await suite.fixtures().createEmployee();

            const list = suite.repository().getLookupList({
                organization: other.organization.id,
                realm: entity.organization.realm,
                pagination: { currentPage: 1, elementsPerPage: 10 },
                term,
            });

            await expect(list).resolves.toEqual([[], 0]);
        });

        it("trims the term, ranks exact matches first and scopes search to organization and realm", async () => {
            const organization = await suite.fixtures().createOrganization();
            const close = await suite
                .fixtures()
                .createEmployee({ organization, lastName: "Morgann", createdAt: new Date("2026-01-01T00:00:00Z") });
            const exact = await suite
                .fixtures()
                .createEmployee({ organization, lastName: "Morgan", createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createEmployee({ organization, lastName: "Unrelated" });
            const otherOrganization = await suite.fixtures().createOrganization();
            await suite.fixtures().createEmployee({ organization: otherOrganization, lastName: "Morgan" });

            const [entries, total] = await suite.repository().getLookupList({
                organization: organization.id,
                realm: organization.realm,
                term: "  Morgan  ",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            expect(total).toBe(2);
            expect(entries.map(({ id }) => id)).toEqual([exact.id, close.id]);
        });

        it("returns no matches for an unknown realm", async () => {
            const entity = await suite.fixtures().createEmployee();
            const realm = randomUUID();

            const list = suite.repository().getLookupList({
                organization: entity.organization.id,
                realm,
                term: "Morgan",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            await expect(list).resolves.toEqual([[], 0]);
        });

        it("searches by employeeNumber", async () => {
            const entity = await suite.fixtures().createEmployee({ employeeNumber: "ZXQ987654" });

            const [entries, total] = await suite.repository().getLookupList({
                organization: entity.organization.id,
                realm: entity.organization.realm,
                term: "ZXQ987654",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            expect(total).toBe(1);
            expect(entries[0]).toMatchObject({ id: entity.id, employeeNumber: "ZXQ987654" });
        });

        it("paginates blank-term results by creation time with the full count", async () => {
            const organization = await suite.fixtures().createOrganization();
            await suite.fixtures().createEmployee({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            const second = await suite
                .fixtures()
                .createEmployee({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createEmployee({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

            const [entries, total] = await suite.repository().getLookupList({
                organization: organization.id,
                realm: organization.realm,
                term: "   ",
                pagination: { currentPage: 2, elementsPerPage: 1 },
            });

            expect(total).toBe(3);
            expect(entries.map(({ id }) => id)).toEqual([second.id]);
        });

        it("returns an empty page when the search has no matches", async () => {
            const entity = await suite.fixtures().createEmployee();

            const list = suite.repository().getLookupList({
                organization: entity.organization.id,
                realm: entity.organization.realm,
                term: "zzzzzzzzzzzz",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            await expect(list).resolves.toEqual([[], 0]);
        });
    });
});
