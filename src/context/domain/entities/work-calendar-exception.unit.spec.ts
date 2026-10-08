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

describe("WorkCalendarException Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createWorkCalendarException();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
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
            const entity = createWorkCalendarException(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("update", () => {
        it("should update changed fields and preserve omitted or undefined values", () => {
            const entity = createWorkCalendarException({ name: "Holiday", source: "manual" });

            entity.update({ patch: { name: "Working day", source: undefined } });

            expect(entity.name).toBe("Working day");
            expect(entity.source).toEqual("manual");
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject an empty patch without changing metadata", () => {
            const entity = createWorkCalendarException();

            expect(() => entity.update({ patch: {} })).toThrow("EMPTY_UPDATE_PATCH");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should reject unchanged and undefined-only patches", () => {
            const entity = createWorkCalendarException({ name: "Holiday" });

            expect(() => entity.update({ patch: { name: "Holiday" } })).toThrow("NO_CHANGES_DETECTED");
            expect(() => entity.update({ patch: { name: undefined } })).toThrow("NO_CHANGES_DETECTED");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should apply changed values alongside unchanged fields", () => {
            const entity = createWorkCalendarException({ name: "Holiday" });

            entity.update({ patch: { name: "Holiday", source: "manual" } });

            expect(entity.name).toBe("Holiday");
            expect(entity.source).toEqual("manual");
        });

        it("should preserve explicit false and zero overrides", () => {
            const entity = createWorkCalendarException({ holidayOverride: true, shortenedByMinutes: 60 });
            entity.update({
                patch: { holidayOverride: false, shortenedByMinutes: 0, workdayOverride: DayOverride.WORKDAY },
            });

            expect(entity.holidayOverride).toBe(false);
            expect(entity.shortenedByMinutes).toBe(0);
            expect(entity.workdayOverride).toBe(DayOverride.WORKDAY);
        });
    });

    describe("canCreate", () => {
        it("should accept a calendar from the same organization", () => {
            expect(() => createWorkCalendarException().canCreate()).not.toThrow();
        });

        it("should reject a calendar from another organization", () => {
            const entity = createWorkCalendarException({
                calendar: { organization: { id: "other" } } as Entities.WorkCalendar,
            });

            expect(() => entity.canCreate()).toThrow("ORGANIZATION_MISMATCH");
        });
    });
});
