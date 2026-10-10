import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { RecordStatus } from "~context/enums";

import { LeavePolicy } from "./leave-policy.entity";

const organization = { id: "organization", realm: "realm" };

function createLeavePolicy(overrides?: Partial<Entities.LeavePolicy.ConstructorProps>): LeavePolicy {
    return new LeavePolicy({
        organization,
        code: "ANNUAL",
        name: "Annual leave",
        jurisdiction: "MA",
        rules: [
            {
                poolCode: "annual",
                unit: "DAY",
                accrualBasis: "NONE",
                dayCounting: "CALENDAR_DAYS",
                availability: "BALANCE",
                expiration: null,
            },
        ],
        ...overrides,
    });
}

describe("[Entity] - LeavePolicy", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createLeavePolicy();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
            const props: Partial<Entities.LeavePolicy.ConstructorProps> = {
                code: "ALT",
                name: "Alternative",
                jurisdiction: "FR",
                revision: 4,
                status: RecordStatus.ARCHIVED,
                rules: [
                    {
                        poolCode: "sick",
                        unit: "DAY",
                        accrualBasis: "NONE",
                        dayCounting: "CALENDAR_DAYS",
                        availability: "SUPPORTING_DOCUMENT",
                        expiration: null,
                    },
                ],
                organization,
            };

            // Act
            const entity = createLeavePolicy(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("[case] - defaults status and revision", () => {
            // Arrange

            // Act
            const entity = createLeavePolicy();

            // Assert
            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.revision).toBe(1);
        });

        it("[case] - initializes independent empty relation collections", () => {
            // Arrange

            // Act
            const entity = createLeavePolicy();
            const other = createLeavePolicy();
            const result = entity.leaveLedgerEntries.getItems();
            const result1 = entity.leaveLedgerEntries;
            const result2 = entity.employmentHistory.getItems();
            const result3 = entity.employmentHistory;
            const result4 = entity.employees.getItems();
            const result5 = entity.employees;
            const result6 = entity.absences.getItems();

            // Assert
            expect(result).toEqual([]);
            expect(result1).not.toBe(other.leaveLedgerEntries);
            expect(result2).toEqual([]);
            expect(result3).not.toBe(other.employmentHistory);
            expect(result4).toEqual([]);
            expect(result5).not.toBe(other.employees);
            expect(result6).toEqual([]);
            expect(entity.absences).not.toBe(other.absences);
        });
    });

    describe("[Method] - archive", () => {
        it("[case] - archives an active record", () => {
            // Arrange
            const entity = createLeavePolicy();

            // Act
            entity.archive();

            // Assert
            expect(entity.status).toBe(RecordStatus.ARCHIVED);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects repeated archival", () => {
            // Arrange
            const entity = createLeavePolicy({ status: RecordStatus.ARCHIVED });

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
            const entity = createLeavePolicy({ status: RecordStatus.ARCHIVED });

            // Act
            entity.restore();

            // Assert
            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects restoring an active record", () => {
            // Arrange

            // Act
            const act = (): unknown => createLeavePolicy().restore();

            // Assert
            expect(act).toThrow("ALREADY_ACTIVE");
        });
    });

    describe("[Method] - canPurge", () => {
        it("[case] - rejects an active record", () => {
            // Arrange

            // Act
            const act = (): unknown => createLeavePolicy().canPurge();

            // Assert
            expect(act).toThrow("CANNOT_PURGE_ACTIVE");
        });

        it("[case] - allows an archived record", () => {
            // Arrange

            // Act
            const act = (): unknown => createLeavePolicy({ status: RecordStatus.ARCHIVED }).canPurge();

            // Assert
            expect(act).not.toThrow();
        });
    });

    describe("[Method] - createRevision", () => {
        it("[case] - creates an independent revision without changing the original", () => {
            // Arrange
            const entity = createLeavePolicy({ revision: 3 });

            // Act
            const revision = entity.createRevision({ name: "Updated" });

            // Assert
            expect(revision.id).not.toBe(entity.id);
            expect(revision.revision).toBe(4);
            expect(revision.name).toBe("Updated");
            expect(revision.code).toBe(entity.code);
            expect(revision.organization).toBe(entity.organization);
            expect(revision.status).toBe(RecordStatus.ACTIVE);
            expect(revision.rules).toEqual(entity.rules);
            expect(revision.rules).not.toBe(entity.rules);
            expect(entity.revision).toBe(3);
            expect(entity.name).not.toBe("Updated");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - rejects empty, undefined and deeply equal changes", () => {
            // Arrange
            const entity = createLeavePolicy();

            // Act
            const act = (): unknown => entity.createRevision({});
            const act1 = (): unknown => entity.createRevision({ name: undefined });
            const act2 = (): unknown => entity.createRevision({ rules: createLeavePolicy().rules });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
            expect(act1).toThrow("NO_CHANGES_DETECTED");
            expect(act2).toThrow("NO_CHANGES_DETECTED");
        });

        it("[case] - rejects archived records", () => {
            // Arrange
            const entity = createLeavePolicy({ status: RecordStatus.ARCHIVED });

            // Act
            const act = (): unknown => entity.createRevision({ name: "Updated" });

            // Assert
            expect(act).toThrow("CANNOT_UPDATE_ARCHIVED");
        });

        it("[case] - applies jurisdiction and rules while preserving the name", () => {
            // Arrange
            const entity = createLeavePolicy();
            const rules = [{ ...entity.rules[0], annualEntitlement: "25" }];

            // Act
            const revision = entity.createRevision({ jurisdiction: "FR", rules });

            // Assert
            expect(revision.jurisdiction).toBe("FR");
            expect(revision.name).toBe(entity.name);
            expect(revision.rules).toEqual(rules);
        });

        it("[case] - clones nested leave rules", () => {
            // Arrange
            const entity = createLeavePolicy();
            const rules = [{ ...entity.rules[0], annualEntitlement: "25" }];

            // Act
            const revision = entity.createRevision({ jurisdiction: "FR", rules });
            rules[0].annualEntitlement = "30";

            // Assert
            expect(revision.rules[0].annualEntitlement).toBe("25");
        });
    });
});
