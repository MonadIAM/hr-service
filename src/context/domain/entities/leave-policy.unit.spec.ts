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

describe("LeavePolicy Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createLeavePolicy();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
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
            const entity = createLeavePolicy(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("should default status and revision", () => {
            const entity = createLeavePolicy();

            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.revision).toBe(1);
        });

        it("should initialize independent empty relation collections", () => {
            const entity = createLeavePolicy();
            const other = createLeavePolicy();

            expect(entity.leaveLedgerEntries.getItems()).toEqual([]);
            expect(entity.leaveLedgerEntries).not.toBe(other.leaveLedgerEntries);
            expect(entity.employmentHistory.getItems()).toEqual([]);
            expect(entity.employmentHistory).not.toBe(other.employmentHistory);
            expect(entity.employees.getItems()).toEqual([]);
            expect(entity.employees).not.toBe(other.employees);
            expect(entity.absences.getItems()).toEqual([]);
            expect(entity.absences).not.toBe(other.absences);
        });
    });

    describe("archive", () => {
        it("should archive an active record", () => {
            const entity = createLeavePolicy();
            entity.archive();

            expect(entity.status).toBe(RecordStatus.ARCHIVED);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject repeated archival", () => {
            const entity = createLeavePolicy({ status: RecordStatus.ARCHIVED });

            expect(() => entity.archive()).toThrow("ALREADY_ARCHIVED");
            expect(entity.updatedAt).toBeUndefined();
        });
    });

    describe("restore", () => {
        it("should restore an archived record", () => {
            const entity = createLeavePolicy({ status: RecordStatus.ARCHIVED });
            entity.restore();

            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject restoring an active record", () => {
            expect(() => createLeavePolicy().restore()).toThrow("ALREADY_ACTIVE");
        });
    });

    describe("canPurge", () => {
        it("should reject an active record", () => {
            expect(() => createLeavePolicy().canPurge()).toThrow("CANNOT_PURGE_ACTIVE");
        });

        it("should allow an archived record", () => {
            expect(() => createLeavePolicy({ status: RecordStatus.ARCHIVED }).canPurge()).not.toThrow();
        });
    });

    describe("createRevision", () => {
        it("should create an independent revision without changing the original", () => {
            const entity = createLeavePolicy({ revision: 3 });
            const revision = entity.createRevision({ name: "Updated" });

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

        it("should reject empty, undefined and deeply equal changes", () => {
            const entity = createLeavePolicy();

            expect(() => entity.createRevision({})).toThrow("NO_CHANGES_DETECTED");
            expect(() => entity.createRevision({ name: undefined })).toThrow("NO_CHANGES_DETECTED");
            expect(() => entity.createRevision({ rules: createLeavePolicy().rules })).toThrow("NO_CHANGES_DETECTED");
        });

        it("should reject archived records", () => {
            const entity = createLeavePolicy({ status: RecordStatus.ARCHIVED });

            expect(() => entity.createRevision({ name: "Updated" })).toThrow("CANNOT_UPDATE_ARCHIVED");
        });

        it("should apply jurisdiction and rules with independent nested objects", () => {
            const entity = createLeavePolicy();
            const rules = [{ ...entity.rules[0], annualEntitlement: "25" }];
            const revision = entity.createRevision({ jurisdiction: "FR", rules });

            expect(revision.jurisdiction).toBe("FR");
            expect(revision.name).toBe(entity.name);
            expect(revision.rules).toEqual(rules);
            rules[0].annualEntitlement = "30";

            expect(revision.rules[0].annualEntitlement).toBe("25");
        });
    });
});
