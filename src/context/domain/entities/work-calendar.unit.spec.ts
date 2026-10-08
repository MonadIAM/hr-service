import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { RecordStatus } from "~context/enums";

import { WorkCalendar } from "./work-calendar.entity";

const organization = { id: "organization", realm: "realm" };

function createWorkCalendar(overrides?: Partial<Entities.WorkCalendar.ConstructorProps>): WorkCalendar {
    return new WorkCalendar({
        organization,
        code: "MAIN",
        name: "Main calendar",
        countryCode: "MA",
        status: RecordStatus.ACTIVE,
        holidays: [],
        ...overrides,
    });
}

describe("WorkCalendar Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createWorkCalendar();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
            const props: Partial<Entities.WorkCalendar.ConstructorProps> = {
                code: "ALT",
                name: "Regional calendar",
                countryCode: "FR",
                regionCode: "IDF",
                verifiedThrough: "2027-12-31",
                status: RecordStatus.ARCHIVED,
                holidays: [
                    {
                        code: "NY",
                        name: "New Year",
                        isPublicHoliday: true,
                        effectiveFrom: "2026-01-01",
                        effectiveTo: null,
                        periods: [{ from: "01-01", through: "01-01" }],
                    },
                ],
                organization,
            };
            const entity = createWorkCalendar(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("should initialize independent empty relation collections", () => {
            const entity = createWorkCalendar();
            const other = createWorkCalendar();

            expect(entity.exceptions.getItems()).toEqual([]);
            expect(entity.exceptions).not.toBe(other.exceptions);
            expect(entity.employmentHistory.getItems()).toEqual([]);
            expect(entity.employmentHistory).not.toBe(other.employmentHistory);
            expect(entity.employees.getItems()).toEqual([]);
            expect(entity.employees).not.toBe(other.employees);
        });
    });

    describe("archive", () => {
        it("should archive an active record", () => {
            const entity = createWorkCalendar();
            entity.archive();

            expect(entity.status).toBe(RecordStatus.ARCHIVED);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject repeated archival", () => {
            const entity = createWorkCalendar({ status: RecordStatus.ARCHIVED });

            expect(() => entity.archive()).toThrow("ALREADY_ARCHIVED");
            expect(entity.updatedAt).toBeUndefined();
        });
    });

    describe("restore", () => {
        it("should restore an archived record", () => {
            const entity = createWorkCalendar({ status: RecordStatus.ARCHIVED });
            entity.restore();

            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject restoring an active record", () => {
            expect(() => createWorkCalendar().restore()).toThrow("ALREADY_ACTIVE");
        });
    });

    describe("canPurge", () => {
        it("should reject an active record", () => {
            expect(() => createWorkCalendar().canPurge()).toThrow("CANNOT_PURGE_ACTIVE");
        });

        it("should allow an archived record", () => {
            expect(() => createWorkCalendar({ status: RecordStatus.ARCHIVED }).canPurge()).not.toThrow();
        });
    });

    describe("update", () => {
        it("should update changed fields and preserve omitted or undefined values", () => {
            const entity = createWorkCalendar({ name: "Original", regionCode: "MA-06" });

            entity.update({ patch: { name: "Updated", regionCode: undefined } });

            expect(entity.name).toBe("Updated");
            expect(entity.regionCode).toEqual("MA-06");
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject an empty patch without changing metadata", () => {
            const entity = createWorkCalendar();

            expect(() => entity.update({ patch: {} })).toThrow("EMPTY_UPDATE_PATCH");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should reject unchanged and undefined-only patches", () => {
            const entity = createWorkCalendar({ name: "Original" });

            expect(() => entity.update({ patch: { name: "Original" } })).toThrow("NO_CHANGES_DETECTED");
            expect(() => entity.update({ patch: { name: undefined } })).toThrow("NO_CHANGES_DETECTED");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should apply changed values alongside unchanged fields", () => {
            const entity = createWorkCalendar({ name: "Original" });

            entity.update({ patch: { name: "Original", regionCode: "MA-06" } });

            expect(entity.name).toBe("Original");
            expect(entity.regionCode).toEqual("MA-06");
        });

        it("should reject updates to archived records", () => {
            const entity = createWorkCalendar({ status: RecordStatus.ARCHIVED });

            expect(() => entity.update({ patch: { name: "Updated" } })).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });
});
