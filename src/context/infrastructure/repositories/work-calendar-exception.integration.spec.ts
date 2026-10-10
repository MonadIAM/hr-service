import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { DayOverride } from "~context/enums";

import { WorkCalendarExceptionRepository } from "./work-calendar-exception.repository";

describe("WorkCalendarExceptionRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new WorkCalendarExceptionRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createWorkCalendarException();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                date: "2026-12-25",
                name: "Christmas",
                holidayOverride: true,
                workdayOverride: DayOverride.DAY_OFF,
                source: "manual",
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
            expect(loaded.calendar.id).toBe(entity.calendar.id);
        });
    });

    describe("findMany", () => {
        it("filters by organization and date", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendarException({ organization });
            await suite.fixtures().createWorkCalendarException({ organization, date: "2026-12-24" });
            await suite.fixtures().createWorkCalendarException({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    date: { operator: PublicOrdinalOperator.EQUAL, value: "2026-12-25" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and holidayOverride", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendarException({ organization, holidayOverride: false });
            await suite.fixtures().createWorkCalendarException({ organization, holidayOverride: true });
            await suite.fixtures().createWorkCalendarException({ holidayOverride: false });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    holidayOverride: false,
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the calendar relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendarException({ organization });
            await suite.fixtures().createWorkCalendarException({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { calendar: { operator: PublicLinkOperator.EQUAL, value: matched.calendar.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createWorkCalendarException({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite
                .fixtures()
                .createWorkCalendarException({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite
                .fixtures()
                .createWorkCalendarException({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
