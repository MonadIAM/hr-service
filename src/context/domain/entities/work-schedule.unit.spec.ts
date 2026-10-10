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

describe("[Entity] - WorkSchedule", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createWorkSchedule();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
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

            // Act
            const entity = createWorkSchedule(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("[case] - defaults status and revision", () => {
            // Arrange

            // Act
            const entity = createWorkSchedule();

            // Assert
            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.revision).toBe(1);
        });

        it("[case] - initializes independent empty relation collections", () => {
            // Arrange

            // Act
            const entity = createWorkSchedule();
            const other = createWorkSchedule();
            const result = entity.employmentHistory.getItems();
            const result1 = entity.employmentHistory;
            const result2 = entity.employees.getItems();

            // Assert
            expect(result).toEqual([]);
            expect(result1).not.toBe(other.employmentHistory);
            expect(result2).toEqual([]);
            expect(entity.employees).not.toBe(other.employees);
        });
    });

    describe("[Method] - archive", () => {
        it("[case] - archives an active record", () => {
            // Arrange
            const entity = createWorkSchedule();

            // Act
            entity.archive();

            // Assert
            expect(entity.status).toBe(RecordStatus.ARCHIVED);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects repeated archival", () => {
            // Arrange
            const entity = createWorkSchedule({ status: RecordStatus.ARCHIVED });

            // Act
            const act = (): unknown => entity.archive();

            // Assert
            expect(act).toThrow("ALREADY_ARCHIVED");
            expect(entity.updatedAt).toBeUndefined();
        });
    });

    describe("[Method] - restore", () => {
        it("[case] - restores an archived record", () => {
            // Arrange
            const entity = createWorkSchedule({ status: RecordStatus.ARCHIVED });

            // Act
            entity.restore();

            // Assert
            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects restoring an active record", () => {
            // Arrange

            // Act
            const act = (): unknown => createWorkSchedule().restore();

            // Assert
            expect(act).toThrow("ALREADY_ACTIVE");
        });
    });

    describe("[Method] - canPurge", () => {
        it("[case] - rejects an active record", () => {
            // Arrange

            // Act
            const act = (): unknown => createWorkSchedule().canPurge();

            // Assert
            expect(act).toThrow("CANNOT_PURGE_ACTIVE");
        });

        it("[case] - allows an archived record", () => {
            // Arrange

            // Act
            const act = (): unknown => createWorkSchedule({ status: RecordStatus.ARCHIVED }).canPurge();

            // Assert
            expect(act).not.toThrow();
        });
    });

    describe("[Method] - createRevision", () => {
        it("[case] - creates an independent revision without changing the original", () => {
            // Arrange
            const entity = createWorkSchedule({ revision: 3 });

            // Act
            const revision = entity.createRevision({ name: "Updated" });

            // Assert
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

        it("[case] - rejects empty, undefined and deeply equal changes", () => {
            // Arrange
            const entity = createWorkSchedule();

            // Act
            const act = (): unknown => entity.createRevision({});
            const act1 = (): unknown => entity.createRevision({ name: undefined });
            const act2 = (): unknown => entity.createRevision({ pattern: createWorkSchedule().pattern });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
            expect(act1).toThrow("NO_CHANGES_DETECTED");
            expect(act2).toThrow("NO_CHANGES_DETECTED");
        });

        it("[case] - rejects archived records", () => {
            // Arrange
            const entity = createWorkSchedule({ status: RecordStatus.ARCHIVED });

            // Act
            const act = (): unknown => entity.createRevision({ name: "Updated" });

            // Assert
            expect(act).toThrow("CANNOT_UPDATE_ARCHIVED");
        });

        it("[case] - applies all supplied schedule settings", () => {
            // Arrange
            const entity = createWorkSchedule();
            const pattern: Entities.WorkSchedule.Pattern.Cyclic = {
                schemaVersion: 1,
                cycle: [{ intervals: [{ start: "20:00", end: "08:00", endDayOffset: 1 }] }],
            };

            // Act
            const revision = entity.createRevision({
                name: "Night",
                patternType: SchedulePattern.CYCLIC,
                calendarApplication: CalendarApplication.APPLY_OVERRIDES,
                pattern,
            });

            // Assert
            expect(revision).toMatchObject({
                name: "Night",
                patternType: SchedulePattern.CYCLIC,
                calendarApplication: CalendarApplication.APPLY_OVERRIDES,
                pattern,
            });
        });

        it("[case] - clones nested schedule intervals", () => {
            // Arrange
            const entity = createWorkSchedule();
            const pattern: Entities.WorkSchedule.Pattern.Cyclic = {
                schemaVersion: 1,
                cycle: [{ intervals: [{ start: "20:00", end: "08:00", endDayOffset: 1 }] }],
            };

            // Act
            const revision = entity.createRevision({
                name: "Night",
                patternType: SchedulePattern.CYCLIC,
                calendarApplication: CalendarApplication.APPLY_OVERRIDES,
                pattern,
            });
            pattern.cycle[0].intervals[0].start = "21:00";

            // Assert
            expect(revision.pattern).not.toEqual(pattern);
        });
    });
});
