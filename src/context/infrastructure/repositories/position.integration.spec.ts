import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { RecordStatus } from "~context/enums";

import { PositionRepository } from "./position.repository";

describe("PositionRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new PositionRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createPosition();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                code: entity.code,
                title: "Engineer",
                plannedFte: "1.0000",
                department: entity.department,
                team: entity.team,
                status: RecordStatus.ACTIVE,
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
        });
    });

    describe("findMany", () => {
        it("filters by organization and title", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createPosition({ organization });
            await suite.fixtures().createPosition({ organization, title: "Accountant" });
            await suite.fixtures().createPosition({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    title: { operator: PublicStringOperator.ILIKE, value: "engineer" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and plannedFte", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createPosition({ organization });
            await suite.fixtures().createPosition({ organization, plannedFte: "0.5000" });
            await suite.fixtures().createPosition({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    plannedFte: { operator: PublicOrdinalOperator.EQUAL, value: "1" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createPosition({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createPosition({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createPosition({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
        it.each(["", "Engineer"])("requires matching organization and realm for term '%s'", async (term) => {
            const entity = await suite.fixtures().createPosition();
            const other = await suite.fixtures().createPosition();

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
                .createPosition({ organization, title: "Engineerr", createdAt: new Date("2026-01-01T00:00:00Z") });
            const exact = await suite
                .fixtures()
                .createPosition({ organization, title: "Engineer", createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createPosition({ organization, title: "Unrelated" });
            const otherOrganization = await suite.fixtures().createOrganization();
            await suite.fixtures().createPosition({ organization: otherOrganization, title: "Engineer" });

            const [entries, total] = await suite.repository().getLookupList({
                organization: organization.id,
                realm: organization.realm,
                term: "  Engineer  ",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            expect(total).toBe(2);
            expect(entries.map(({ id }) => id)).toEqual([exact.id, close.id]);
        });

        it("returns no matches for an unknown realm", async () => {
            const entity = await suite.fixtures().createPosition();
            const realm = randomUUID();

            const list = suite.repository().getLookupList({
                organization: entity.organization.id,
                realm,
                term: "Engineer",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            await expect(list).resolves.toEqual([[], 0]);
        });

        it("searches by code", async () => {
            const entity = await suite.fixtures().createPosition({ code: "ZXQ987654" });

            const [entries, total] = await suite.repository().getLookupList({
                organization: entity.organization.id,
                realm: entity.organization.realm,
                term: "ZXQ987654",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            expect(total).toBe(1);
            expect(entries[0]).toMatchObject({ id: entity.id, code: "ZXQ987654" });
        });

        it("paginates blank-term results by creation time with the full count", async () => {
            const organization = await suite.fixtures().createOrganization();
            await suite.fixtures().createPosition({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            const second = await suite
                .fixtures()
                .createPosition({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createPosition({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
            const entity = await suite.fixtures().createPosition();

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
