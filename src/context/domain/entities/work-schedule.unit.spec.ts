import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { RecordStatus, SchedulePattern, CalendarApplication } from "~context/enums";

import { WorkSchedule } from "./work-schedule.entity";

const organization = { id: "organization", realm: "realm" };

function createWorkSchedule(overrides?: Partial<Entities.WorkSchedule.ConstructorProps>): WorkSchedule {
    return new WorkSchedule({
        organization,
        code: "SHIFT",
        name: "Shift schedule",
        patternType: SchedulePattern.CYCLIC,
        calendarApplication: CalendarApplication.KEEP_CYCLE,
        pattern: { schemaVersion: 1, cycle: [{ intervals: [{ start: "09:00", end: "17:00", endDayOffset: 0 }] }] },
        ...overrides,
    });
}

describe("WorkSchedule Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createWorkSchedule();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
            const props: Partial<Entities.WorkSchedule.ConstructorProps> = {
                code: "ALT",
                name: "Alternative",
                revision: 4,
                status: RecordStatus.ARCHIVED,
                patternType: SchedulePattern.CYCLIC,
                calendarApplication: CalendarApplication.APPLY_OVERRIDES,
                pattern: { schemaVersion: 1, cycle: [{ intervals: [] }] },
                organization,
            };
            const entity = createWorkSchedule(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("should default status and revision", () => {
            const entity = createWorkSchedule();

            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.revision).toBe(1);
        });

        it("should initialize independent empty relation collections", () => {
            const entity = createWorkSchedule();
            const other = createWorkSchedule();

            expect(entity.employmentHistory.getItems()).toEqual([]);
            expect(entity.employmentHistory).not.toBe(other.employmentHistory);
            expect(entity.employees.getItems()).toEqual([]);
            expect(entity.employees).not.toBe(other.employees);
        });
    });

    describe("archive", () => {
        it("should archive an active record", () => {
            const entity = createWorkSchedule();
            entity.archive();

            expect(entity.status).toBe(RecordStatus.ARCHIVED);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject repeated archival", () => {
            const entity = createWorkSchedule({ status: RecordStatus.ARCHIVED });

            expect(() => entity.archive()).toThrow("ALREADY_ARCHIVED");
            expect(entity.updatedAt).toBeUndefined();
        });
    });

    describe("restore", () => {
        it("should restore an archived record", () => {
            const entity = createWorkSchedule({ status: RecordStatus.ARCHIVED });
            entity.restore();

            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject restoring an active record", () => {
            expect(() => createWorkSchedule().restore()).toThrow("ALREADY_ACTIVE");
        });
    });

    describe("canPurge", () => {
        it("should reject an active record", () => {
            expect(() => createWorkSchedule().canPurge()).toThrow("CANNOT_PURGE_ACTIVE");
        });

        it("should allow an archived record", () => {
            expect(() => createWorkSchedule({ status: RecordStatus.ARCHIVED }).canPurge()).not.toThrow();
        });
    });

    describe("createRevision", () => {
        it("should create an independent revision without changing the original", () => {
            const entity = createWorkSchedule({ revision: 3 });
            const revision = entity.createRevision({ name: "Updated" });

            expect(revision.id).not.toBe(entity.id);
            expect(revision.revision).toBe(4);
            expect(revision.name).toBe("Updated");
            expect(revision.code).toBe(entity.code);
            expect(revision.organization).toBe(entity.organization);
            expect(revision.status).toBe(RecordStatus.ACTIVE);
            expect(revision.pattern).toEqual(entity.pattern);
            expect(revision.pattern).not.toBe(entity.pattern);
            expect(entity.revision).toBe(3);
            expect(entity.name).not.toBe("Updated");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should reject empty, undefined and deeply equal changes", () => {
            const entity = createWorkSchedule();

            expect(() => entity.createRevision({})).toThrow("NO_CHANGES_DETECTED");
            expect(() => entity.createRevision({ name: undefined })).toThrow("NO_CHANGES_DETECTED");
            expect(() => entity.createRevision({ pattern: createWorkSchedule().pattern })).toThrow("NO_CHANGES_DETECTED");
        });

        it("should reject archived records", () => {
            const entity = createWorkSchedule({ status: RecordStatus.ARCHIVED });

            expect(() => entity.createRevision({ name: "Updated" })).toThrow("CANNOT_UPDATE_ARCHIVED");
        });

        it("should apply all supplied schedule settings and clone nested intervals", () => {
            const entity = createWorkSchedule();
            const pattern: Entities.WorkSchedule.Pattern.Cyclic = {
                schemaVersion: 1,
                cycle: [{ intervals: [{ start: "20:00", end: "08:00", endDayOffset: 1 }] }],
            };
            const revision = entity.createRevision({
                name: "Night",
                patternType: SchedulePattern.CYCLIC,
                calendarApplication: CalendarApplication.APPLY_OVERRIDES,
                pattern,
            });

            expect(revision).toMatchObject({
                name: "Night",
                patternType: SchedulePattern.CYCLIC,
                calendarApplication: CalendarApplication.APPLY_OVERRIDES,
                pattern,
            });
            pattern.cycle[0].intervals[0].start = "21:00";

            expect(revision.pattern).not.toEqual(pattern);
        });
    });
});
