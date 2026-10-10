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

describe("[Entity] - WorkCalendar", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createWorkCalendar();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
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

            // Act
            const entity = createWorkCalendar(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("[case] - initializes independent empty relation collections", () => {
            // Arrange

            // Act
            const entity = createWorkCalendar();
            const other = createWorkCalendar();
            const result = entity.exceptions.getItems();
            const result1 = entity.exceptions;
            const result2 = entity.employmentHistory.getItems();
            const result3 = entity.employmentHistory;
            const result4 = entity.employees.getItems();

            // Assert
            expect(result).toEqual([]);
            expect(result1).not.toBe(other.exceptions);
            expect(result2).toEqual([]);
            expect(result3).not.toBe(other.employmentHistory);
            expect(result4).toEqual([]);
            expect(entity.employees).not.toBe(other.employees);
        });
    });

    describe("[Method] - archive", () => {
        it("[case] - archives an active record", () => {
            // Arrange
            const entity = createWorkCalendar();

            // Act
            entity.archive();

            // Assert
            expect(entity.status).toBe(RecordStatus.ARCHIVED);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects repeated archival", () => {
            // Arrange
            const entity = createWorkCalendar({ status: RecordStatus.ARCHIVED });

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
            const entity = createWorkCalendar({ status: RecordStatus.ARCHIVED });

            // Act
            entity.restore();

            // Assert
            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects restoring an active record", () => {
            // Arrange

            // Act
            const act = (): unknown => createWorkCalendar().restore();

            // Assert
            expect(act).toThrow("ALREADY_ACTIVE");
        });
    });

    describe("[Method] - canPurge", () => {
        it("[case] - rejects an active record", () => {
            // Arrange

            // Act
            const act = (): unknown => createWorkCalendar().canPurge();

            // Assert
            expect(act).toThrow("CANNOT_PURGE_ACTIVE");
        });

        it("[case] - allows an archived record", () => {
            // Arrange

            // Act
            const act = (): unknown => createWorkCalendar({ status: RecordStatus.ARCHIVED }).canPurge();

            // Assert
            expect(act).not.toThrow();
        });
    });

    describe("[Method] - update", () => {
        it("[case] - updates changed fields and preserve omitted or undefined values", () => {
            // Arrange
            const entity = createWorkCalendar({ name: "Original", regionCode: "MA-06" });

            // Act
            entity.update({ patch: { name: "Updated", regionCode: undefined } });

            // Assert
            expect(entity.name).toBe("Updated");
            expect(entity.regionCode).toEqual("MA-06");
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects an empty patch without changing metadata", () => {
            // Arrange
            const entity = createWorkCalendar();

            // Act
            const act = (): unknown => entity.update({ patch: {} });

            // Assert
            expect(act).toThrow("EMPTY_UPDATE_PATCH");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - rejects unchanged and undefined-only patches", () => {
            // Arrange
            const entity = createWorkCalendar({ name: "Original" });

            // Act
            const act = (): unknown => entity.update({ patch: { name: "Original" } });
            const act1 = (): unknown => entity.update({ patch: { name: undefined } });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
            expect(act1).toThrow("NO_CHANGES_DETECTED");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - applies changed values alongside unchanged fields", () => {
            // Arrange
            const entity = createWorkCalendar({ name: "Original" });

            // Act
            entity.update({ patch: { name: "Original", regionCode: "MA-06" } });

            // Assert
            expect(entity.name).toBe("Original");
            expect(entity.regionCode).toEqual("MA-06");
        });

        it("[case] - rejects updates to archived records", () => {
            // Arrange
            const entity = createWorkCalendar({ status: RecordStatus.ARCHIVED });

            // Act
            const act = (): unknown => entity.update({ patch: { name: "Updated" } });

            // Assert
            expect(act).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });
});
