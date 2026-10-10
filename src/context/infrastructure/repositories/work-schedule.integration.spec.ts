import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicOrdinalOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { SchedulePattern, CalendarApplication } from "~context/enums";

import { WorkScheduleRepository } from "./work-schedule.repository";

describe("[Repository] - WorkSchedule", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new WorkScheduleRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - loads persisted fields and relations through the schema", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkSchedule();

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            // Assert
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

    describe("[Method] - findMany", () => {
        it("[case] - filters by organization and revision", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkSchedule({ organization });
            await suite.fixtures().createWorkSchedule({ organization, revision: 2 });
            await suite.fixtures().createWorkSchedule({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    revision: { operator: PublicOrdinalOperator.EQUAL, value: 1 },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by organization and calendarApplication", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkSchedule({ organization });
            await suite.fixtures().createWorkSchedule({
                calendarApplication: CalendarApplication.APPLY_OVERRIDES,
                organization,
            });
            await suite.fixtures().createWorkSchedule({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    calendarApplication: { operator: PublicStringOperator.EQUAL, value: CalendarApplication.KEEP_CYCLE },
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                },
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
            const first = await suite.fixtures().createWorkSchedule({
                createdAt: new Date("2026-01-01T00:00:00Z"),
                organization,
            });
            await suite.fixtures().createWorkSchedule({ createdAt: new Date("2026-01-02T00:00:00Z"), organization });
            await suite.fixtures().createWorkSchedule({ createdAt: new Date("2026-01-03T00:00:00Z"), organization });

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

    describe("[Method] - getLookupList", () => {
        it.each(["", "Standard"])("[case] - requires matching organization and realm for term '%s'", async (term) => {
            // Arrange
            const entity = await suite.fixtures().createWorkSchedule();
            const other = await suite.fixtures().createWorkSchedule();

            // Act
            const list = suite.repository().getLookupList({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                organization: other.organization.id,
                realm: entity.organization.realm,
                term,
            });
            const result = await list;

            // Assert
            expect(result).toEqual([[], 0]);
        });

        it("[case] - trims the term, ranks exact matches first and scopes search to organization and realm", async () => {
            // Arrange
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

            // Act
            const [entries, total] = await suite.repository().getLookupList({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                organization: organization.id,
                realm: organization.realm,
                term: "  Schedule  ",
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(2);
            expect(result1).toEqual([exact.id, close.id]);
        });

        it("[case] - returns no matches for an unknown realm", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkSchedule();
            const realm = randomUUID();

            // Act
            const list = suite.repository().getLookupList({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                organization: entity.organization.id,
                realm,
                term: "Schedule",
            });
            const result = await list;

            // Assert
            expect(result).toEqual([[], 0]);
        });

        it("[case] - searches by code", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkSchedule({ code: "ZXQ987654" });

            // Act
            const [entries, total] = await suite.repository().getLookupList({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                organization: entity.organization.id,
                realm: entity.organization.realm,
                term: "ZXQ987654",
            });

            // Assert
            expect(total).toBe(1);
            expect(entries[0]).toMatchObject({ id: entity.id, code: "ZXQ987654" });
        });

        it("[case] - paginates blank-term results by creation time with the full count", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            await suite.fixtures().createWorkSchedule({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createWorkSchedule({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });
            const second = await suite.fixtures().createWorkSchedule({
                createdAt: new Date("2026-01-02T00:00:00Z"),
                organization,
            });

            // Act
            const [entries, total] = await suite.repository().getLookupList({
                pagination: { currentPage: 2, elementsPerPage: 1 },
                organization: organization.id,
                realm: organization.realm,
                term: "   ",
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(3);
            expect(result1).toEqual([second.id]);
        });

        it("[case] - returns an empty page when the search has no matches", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkSchedule();

            // Act
            const list = suite.repository().getLookupList({
                organization: entity.organization.id,
                realm: entity.organization.realm,
                term: "zzzzzzzzzzzz",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });
            const result = await list;

            // Assert
            expect(result).toEqual([[], 0]);
        });
    });
});
