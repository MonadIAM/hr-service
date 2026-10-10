import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicOrdinalOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { SchedulePattern, CalendarApplication } from "~context/enums";

import { WorkScheduleRepository } from "./work-schedule.repository";

describe("WorkScheduleRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new WorkScheduleRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createWorkSchedule();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                code: entity.code,
                name: "Standard schedule",
                revision: 1,
                patternType: SchedulePattern.CYCLIC,
                calendarApplication: CalendarApplication.KEEP_CYCLE,
                pattern: entity.pattern,
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
        });
    });

    describe("findMany", () => {
        it("filters by organization and revision", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkSchedule({ organization });
            await suite.fixtures().createWorkSchedule({ organization, revision: 2 });
            await suite.fixtures().createWorkSchedule({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    revision: { operator: PublicOrdinalOperator.EQUAL, value: 1 },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and calendarApplication", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkSchedule({ organization });
            await suite.fixtures().createWorkSchedule({
                calendarApplication: CalendarApplication.APPLY_OVERRIDES,
                organization,
            });
            await suite.fixtures().createWorkSchedule({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    calendarApplication: { operator: PublicStringOperator.EQUAL, value: CalendarApplication.KEEP_CYCLE },
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite.fixtures().createWorkSchedule({
                createdAt: new Date("2026-01-01T00:00:00Z"),
                organization,
            });
            await suite.fixtures().createWorkSchedule({ createdAt: new Date("2026-01-02T00:00:00Z"), organization });
            await suite.fixtures().createWorkSchedule({ createdAt: new Date("2026-01-03T00:00:00Z"), organization });

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
            const entity = await suite.fixtures().createWorkSchedule();
            const other = await suite.fixtures().createWorkSchedule();

            const list = suite.repository().getLookupList({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                organization: other.organization.id,
                realm: entity.organization.realm,
                term,
            });

            await expect(list).resolves.toEqual([[], 0]);
        });

        it("trims the term, ranks exact matches first and scopes search to organization and realm", async () => {
            const organization = await suite.fixtures().createOrganization();
            const close = await suite
                .fixtures()
                .createWorkSchedule({ organization, name: "Schedulee", createdAt: new Date("2026-01-01T00:00:00Z") });
            const exact = await suite
                .fixtures()
                .createWorkSchedule({ organization, name: "Schedule", createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createWorkSchedule({ organization, name: "Unrelated" });
            const otherOrganization = await suite.fixtures().createOrganization();
            await suite.fixtures().createWorkSchedule({ organization: otherOrganization, name: "Schedule" });

            const [entries, total] = await suite.repository().getLookupList({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                organization: organization.id,
                realm: organization.realm,
                term: "  Schedule  ",
            });

            expect(total).toBe(2);
            expect(entries.map(({ id }) => id)).toEqual([exact.id, close.id]);
        });

        it("returns no matches for an unknown realm", async () => {
            const entity = await suite.fixtures().createWorkSchedule();
            const realm = randomUUID();

            const list = suite.repository().getLookupList({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                organization: entity.organization.id,
                realm,
                term: "Schedule",
            });

            await expect(list).resolves.toEqual([[], 0]);
        });

        it("searches by code", async () => {
            const entity = await suite.fixtures().createWorkSchedule({ code: "ZXQ987654" });

            const [entries, total] = await suite.repository().getLookupList({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                organization: entity.organization.id,
                realm: entity.organization.realm,
                term: "ZXQ987654",
            });

            expect(total).toBe(1);
            expect(entries[0]).toMatchObject({ id: entity.id, code: "ZXQ987654" });
        });

        it("paginates blank-term results by creation time with the full count", async () => {
            const organization = await suite.fixtures().createOrganization();
            await suite.fixtures().createWorkSchedule({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createWorkSchedule({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });
            const second = await suite.fixtures().createWorkSchedule({
                createdAt: new Date("2026-01-02T00:00:00Z"),
                organization,
            });

            const [entries, total] = await suite.repository().getLookupList({
                pagination: { currentPage: 2, elementsPerPage: 1 },
                organization: organization.id,
                realm: organization.realm,
                term: "   ",
            });

            expect(total).toBe(3);
            expect(entries.map(({ id }) => id)).toEqual([second.id]);
        });

        it("returns an empty page when the search has no matches", async () => {
            const entity = await suite.fixtures().createWorkSchedule();

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
