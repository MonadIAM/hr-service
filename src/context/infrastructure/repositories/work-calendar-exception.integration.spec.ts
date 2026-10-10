import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { DayOverride } from "~context/enums";

import { WorkCalendarExceptionRepository } from "./work-calendar-exception.repository";

describe("[Repository] - WorkCalendarException", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new WorkCalendarExceptionRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - loads persisted fields and relations through the schema", async () => {
            // Arrange
            const entity = await suite.fixtures().createWorkCalendarException();

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            // Assert
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

    describe("[Method] - findMany", () => {
        it("[case] - filters by organization and date", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendarException({ organization });
            await suite.fixtures().createWorkCalendarException({ organization, date: "2026-12-24" });
            await suite.fixtures().createWorkCalendarException({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    date: { operator: PublicOrdinalOperator.EQUAL, value: "2026-12-25" },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by organization and holidayOverride", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendarException({ organization, holidayOverride: false });
            await suite.fixtures().createWorkCalendarException({ organization, holidayOverride: true });
            await suite.fixtures().createWorkCalendarException({ holidayOverride: false });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    holidayOverride: false,
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by the calendar relation", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createWorkCalendarException({ organization });
            await suite.fixtures().createWorkCalendarException({ organization });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { calendar: { operator: PublicLinkOperator.EQUAL, value: matched.calendar.id } },
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
                .createWorkCalendarException({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite
                .fixtures()
                .createWorkCalendarException({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite
                .fixtures()
                .createWorkCalendarException({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
