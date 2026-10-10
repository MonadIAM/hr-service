import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { DayOverride } from "~context/enums";

import { WorkCalendarException } from "./work-calendar-exception.entity";

const organization = { id: "organization", realm: "realm" };

function createWorkCalendarException(
    overrides?: Partial<Entities.WorkCalendarException.ConstructorProps>,
): WorkCalendarException {
    return new WorkCalendarException({
        organization,
        calendar: { organization } as Entities.WorkCalendar,
        date: "2026-10-06",
        ...overrides,
    });
}

describe("[Entity] - WorkCalendarException", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createWorkCalendarException();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
            const props: Partial<Entities.WorkCalendarException.ConstructorProps> = {
                date: "2026-12-31",
                name: "Short day",
                source: "manual",
                shortenedByMinutes: 60,
                holidayOverride: false,
                workdayOverride: DayOverride.WORKDAY,
                organization,
                calendar: { organization } as Entities.WorkCalendar,
            };

            // Act
            const entity = createWorkCalendarException(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("[Method] - update", () => {
        it("[case] - updates changed fields and preserve omitted or undefined values", () => {
            // Arrange
            const entity = createWorkCalendarException({ name: "Holiday", source: "manual" });

            // Act
            entity.update({ patch: { name: "Working day", source: undefined } });

            // Assert
            expect(entity.name).toBe("Working day");
            expect(entity.source).toEqual("manual");
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects an empty patch without changing metadata", () => {
            // Arrange
            const entity = createWorkCalendarException();

            // Act
            const act = (): unknown => entity.update({ patch: {} });

            // Assert
            expect(act).toThrow("EMPTY_UPDATE_PATCH");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - rejects unchanged and undefined-only patches", () => {
            // Arrange
            const entity = createWorkCalendarException({ name: "Holiday" });

            // Act
            const act = (): unknown => entity.update({ patch: { name: "Holiday" } });
            const act1 = (): unknown => entity.update({ patch: { name: undefined } });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
            expect(act1).toThrow("NO_CHANGES_DETECTED");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - applies changed values alongside unchanged fields", () => {
            // Arrange
            const entity = createWorkCalendarException({ name: "Holiday" });

            // Act
            entity.update({ patch: { name: "Holiday", source: "manual" } });

            // Assert
            expect(entity.name).toBe("Holiday");
            expect(entity.source).toEqual("manual");
        });

        it("[case] - preserves explicit false and zero overrides", () => {
            // Arrange
            const entity = createWorkCalendarException({ holidayOverride: true, shortenedByMinutes: 60 });

            // Act
            entity.update({
                patch: { holidayOverride: false, shortenedByMinutes: 0, workdayOverride: DayOverride.WORKDAY },
            });

            // Assert
            expect(entity.holidayOverride).toBe(false);
            expect(entity.shortenedByMinutes).toBe(0);
            expect(entity.workdayOverride).toBe(DayOverride.WORKDAY);
        });
    });

    describe("[Method] - canCreate", () => {
        it("[case] - accepts a calendar from the same organization", () => {
            // Arrange

            // Act
            const act = (): unknown => createWorkCalendarException().canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it("[case] - rejects a calendar from another organization", () => {
            // Arrange
            const entity = createWorkCalendarException({
                calendar: { organization: { id: "other" } } as Entities.WorkCalendar,
            });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("ORGANIZATION_MISMATCH");
        });
    });
});
