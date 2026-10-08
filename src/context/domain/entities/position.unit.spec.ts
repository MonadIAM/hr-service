import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { RecordStatus } from "~context/enums";

import { Position } from "./position.entity";

const organization = { id: "organization", realm: "realm" };

function createPosition(overrides?: Partial<Entities.Position.ConstructorProps>): Position {
    return new Position({
        organization,
        code: "DEV",
        title: "Developer",
        department: "Engineering",
        team: "Platform",
        status: RecordStatus.ACTIVE,
        plannedFte: "1",
        ...overrides,
    });
}

describe("Position Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createPosition();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
            const props: Partial<Entities.Position.ConstructorProps> = {
                code: "LEAD",
                title: "Team lead",
                description: "Lead role",
                requirements: "Experience",
                grade: "L5",
                plannedFte: "0.5",
                budgetAmount: "5000",
                budgetCurrency: "EUR",
                department: "Engineering",
                team: "Core",
                status: RecordStatus.ARCHIVED,
                organization,
            };
            const entity = createPosition(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("should initialize independent empty relation collections", () => {
            const entity = createPosition();
            const other = createPosition();

            expect(entity.positionAssignments.getItems()).toEqual([]);
            expect(entity.positionAssignments).not.toBe(other.positionAssignments);
            expect(entity.targetedHRRequests.getItems()).toEqual([]);
            expect(entity.targetedHRRequests).not.toBe(other.targetedHRRequests);
        });
    });

    describe("update", () => {
        it("should update changed fields and preserve omitted or undefined values", () => {
            const entity = createPosition({ title: "Developer", description: "Platform role" });
            entity.completePlacement(false);
            entity.update({ patch: { title: "Senior developer", description: undefined } });

            expect(entity.title).toBe("Senior developer");
            expect(entity.description).toEqual("Platform role");
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject an empty patch without changing metadata", () => {
            const entity = createPosition();
            entity.completePlacement(false);

            expect(() => entity.update({ patch: {} })).toThrow("EMPTY_UPDATE_PATCH");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should reject unchanged and undefined-only patches", () => {
            const entity = createPosition({ title: "Developer" });
            entity.completePlacement(false);

            expect(() => entity.update({ patch: { title: "Developer" } })).toThrow("NO_CHANGES_DETECTED");
            expect(() => entity.update({ patch: { title: undefined } })).toThrow("NO_CHANGES_DETECTED");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should apply changed values alongside unchanged fields", () => {
            const entity = createPosition({ title: "Developer" });
            entity.completePlacement(false);
            entity.update({ patch: { title: "Developer", description: "Platform role" } });

            expect(entity.title).toBe("Developer");
            expect(entity.description).toEqual("Platform role");
        });

        it("should reject updates to archived records", () => {
            const entity = createPosition({ status: RecordStatus.ARCHIVED });
            entity.completePlacement(false);

            expect(() => entity.update({ patch: { title: "Senior developer" } })).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });

    describe("placement", () => {
        it("should start with a pending operation", () => {
            const entity = createPosition();

            expect(isUUID(entity.process!, "4")).toBe(true);
            expect(entity.process).not.toBe(entity.id);
            expect(() => entity.assertReady()).toThrow("OPERATION_PENDING");
        });

        it.each(["archive", "restore", "canPurge"] as const)("should block %s while placement is pending", (method) => {
            expect(() => createPosition()[method]()).toThrow("OPERATION_PENDING");
        });

        it("should block updates while placement is pending", () => {
            expect(() => createPosition().update({ patch: { title: "Updated" } })).toThrow("OPERATION_PENDING");
        });

        it.each([false, true])("should complete initial placement with rejected=%s", (rejected) => {
            const entity = createPosition();
            entity.completePlacement(rejected);

            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.process).toBeUndefined();
            expect(entity.previousStatus).toBeUndefined();
            expect(() => entity.assertReady()).not.toThrow();
        });

        it.each([false, true])("should complete restoration with rejected=%s", (rejected) => {
            const entity = createPosition({ status: RecordStatus.ARCHIVED });
            entity.completePlacement(false);
            entity.restore();

            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.previousStatus).toBe(RecordStatus.ARCHIVED);
            expect(isUUID(entity.process!, "4")).toBe(true);
            entity.completePlacement(rejected);

            expect(entity.status).toBe(rejected ? RecordStatus.ARCHIVED : RecordStatus.ACTIVE);
            expect(entity.previousStatus).toBeUndefined();
            expect(entity.process).toBeUndefined();
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe("archive and purge", () => {
        it("should allow purging only after archival", () => {
            const entity = createPosition();
            entity.completePlacement(false);

            expect(() => entity.canPurge()).toThrow("CANNOT_PURGE_ACTIVE");
            expect(() => entity.restore()).toThrow("ALREADY_ACTIVE");
            entity.archive();

            expect(entity.status).toBe(RecordStatus.ARCHIVED);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            expect(() => entity.archive()).toThrow("ALREADY_ARCHIVED");
            expect(() => entity.canPurge()).not.toThrow();
        });
    });
});
