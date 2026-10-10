import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { RecordStatus } from "~context/enums";

import { WorkCalendarRepository } from "./work-calendar.repository";

describe("WorkCalendarRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new WorkCalendarRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createWorkCalendar();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                code: entity.code,
                name: "Standard calendar",
                countryCode: "GB",
                holidays: entity.holidays,
                status: RecordStatus.ACTIVE,
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
        });
    });

    describe("findMany", () => {
        it("filters by organization and countryCode", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendar({ organization });
            await suite.fixtures().createWorkCalendar({ organization, countryCode: "US" });
            await suite.fixtures().createWorkCalendar({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    countryCode: { operator: PublicStringOperator.EQUAL, value: "GB" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and status", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendar({ organization });
            await suite.fixtures().createWorkCalendar({ organization, status: RecordStatus.ARCHIVED });
            await suite.fixtures().createWorkCalendar({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    status: { operator: PublicStringOperator.EQUAL, value: RecordStatus.ACTIVE },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createWorkCalendar({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createWorkCalendar({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createWorkCalendar({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
        it.each(["", "Standard"])("requires matching organization and realm for term '%s'", async (term) => {
            const entity = await suite.fixtures().createWorkCalendar();
            const other = await suite.fixtures().createWorkCalendar();

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
                .createWorkCalendar({ organization, name: "Calendarr", createdAt: new Date("2026-01-01T00:00:00Z") });
            const exact = await suite
                .fixtures()
                .createWorkCalendar({ organization, name: "Calendar", createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createWorkCalendar({ organization, name: "Unrelated" });
            const otherOrganization = await suite.fixtures().createOrganization();
            await suite.fixtures().createWorkCalendar({ organization: otherOrganization, name: "Calendar" });

            const [entries, total] = await suite.repository().getLookupList({
                organization: organization.id,
                realm: organization.realm,
                term: "  Calendar  ",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            expect(total).toBe(2);
            expect(entries.map(({ id }) => id)).toEqual([exact.id, close.id]);
        });

        it("returns no matches for an unknown realm", async () => {
            const entity = await suite.fixtures().createWorkCalendar();
            const realm = randomUUID();

            const list = suite.repository().getLookupList({
                organization: entity.organization.id,
                realm,
                term: "Calendar",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            await expect(list).resolves.toEqual([[], 0]);
        });

        it("searches by code", async () => {
            const entity = await suite.fixtures().createWorkCalendar({ code: "ZXQ987654" });

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
            await suite.fixtures().createWorkCalendar({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            const second = await suite
                .fixtures()
                .createWorkCalendar({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createWorkCalendar({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
            const entity = await suite.fixtures().createWorkCalendar();

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
