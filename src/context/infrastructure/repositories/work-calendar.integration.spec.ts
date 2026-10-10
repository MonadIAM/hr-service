import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { RecordStatus } from "~context/enums";

import { WorkCalendarRepository } from "./work-calendar.repository";

describe("[Repository] - WorkCalendar", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new WorkCalendarRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - loads persisted fields and relations through the schema", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkCalendar();

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            // Assert
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

    describe("[Method] - findMany", () => {
        it("[case] - filters by organization and countryCode", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendar({ organization });
            await suite.fixtures().createWorkCalendar({ organization, countryCode: "US" });
            await suite.fixtures().createWorkCalendar({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    countryCode: { operator: PublicStringOperator.EQUAL, value: "GB" },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by organization and status", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendar({ organization });
            await suite.fixtures().createWorkCalendar({ organization, status: RecordStatus.ARCHIVED });
            await suite.fixtures().createWorkCalendar({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    status: { operator: PublicStringOperator.EQUAL, value: RecordStatus.ACTIVE },
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
            const first = await suite
                .fixtures()
                .createWorkCalendar({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createWorkCalendar({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createWorkCalendar({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
            const entity = await suite.fixtures().createWorkCalendar();
            const other = await suite.fixtures().createWorkCalendar();

            // Act
            const list = suite.repository().getLookupList({
                organization: other.organization.id,
                realm: entity.organization.realm,
                pagination: { currentPage: 1, elementsPerPage: 10 },
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
                .createWorkCalendar({ organization, name: "Calendarr", createdAt: new Date("2026-01-01T00:00:00Z") });
            const exact = await suite
                .fixtures()
                .createWorkCalendar({ organization, name: "Calendar", createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createWorkCalendar({ organization, name: "Unrelated" });
            const otherOrganization = await suite.fixtures().createOrganization();
            await suite.fixtures().createWorkCalendar({ organization: otherOrganization, name: "Calendar" });

            // Act
            const [entries, total] = await suite.repository().getLookupList({
                organization: organization.id,
                realm: organization.realm,
                term: "  Calendar  ",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(2);
            expect(result1).toEqual([exact.id, close.id]);
        });

        it("[case] - returns no matches for an unknown realm", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkCalendar();
            const realm = randomUUID();

            // Act
            const list = suite.repository().getLookupList({
                organization: entity.organization.id,
                realm,
                term: "Calendar",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });
            const result = await list;

            // Assert
            expect(result).toEqual([[], 0]);
        });

        it("[case] - searches by code", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkCalendar({ code: "ZXQ987654" });

            // Act
            const [entries, total] = await suite.repository().getLookupList({
                organization: entity.organization.id,
                realm: entity.organization.realm,
                term: "ZXQ987654",
                pagination: { currentPage: 1, elementsPerPage: 10 },
            });

            // Assert
            expect(total).toBe(1);
            expect(entries[0]).toMatchObject({ id: entity.id, code: "ZXQ987654" });
        });

        it("[case] - paginates blank-term results by creation time with the full count", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            await suite.fixtures().createWorkCalendar({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            const second = await suite
                .fixtures()
                .createWorkCalendar({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createWorkCalendar({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

            // Act
            const [entries, total] = await suite.repository().getLookupList({
                organization: organization.id,
                realm: organization.realm,
                term: "   ",
                pagination: { currentPage: 2, elementsPerPage: 1 },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(3);
            expect(result1).toEqual([second.id]);
        });

        it("[case] - returns an empty page when the search has no matches", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkCalendar();

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
