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

describe("[Entity] - Position", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createPosition();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
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

            // Act
            const entity = createPosition(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("[case] - initializes independent empty relation collections", () => {
            // Arrange

            // Act
            const entity = createPosition();
            const other = createPosition();
            const result = entity.positionAssignments.getItems();
            const result1 = entity.positionAssignments;
            const result2 = entity.targetedHRRequests.getItems();

            // Assert
            expect(result).toEqual([]);
            expect(result1).not.toBe(other.positionAssignments);
            expect(result2).toEqual([]);
            expect(entity.targetedHRRequests).not.toBe(other.targetedHRRequests);
        });
    });

    describe("[Method] - update", () => {
        it("[case] - updates changed fields and preserve omitted or undefined values", () => {
            // Arrange
            const entity = createPosition({ title: "Developer", description: "Platform role" });

            // Act
            entity.completePlacement(false);
            entity.update({ patch: { title: "Senior developer", description: undefined } });

            // Assert
            expect(entity.title).toBe("Senior developer");
            expect(entity.description).toEqual("Platform role");
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects an empty patch without changing metadata", () => {
            // Arrange
            const entity = createPosition();
            entity.completePlacement(false);

            // Act
            const act = (): unknown => entity.update({ patch: {} });

            // Assert
            expect(act).toThrow("EMPTY_UPDATE_PATCH");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - rejects unchanged and undefined-only patches", () => {
            // Arrange
            const entity = createPosition({ title: "Developer" });
            entity.completePlacement(false);

            // Act
            const act = (): unknown => entity.update({ patch: { title: "Developer" } });
            const act1 = (): unknown => entity.update({ patch: { title: undefined } });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
            expect(act1).toThrow("NO_CHANGES_DETECTED");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - applies changed values alongside unchanged fields", () => {
            // Arrange
            const entity = createPosition({ title: "Developer" });

            // Act
            entity.completePlacement(false);
            entity.update({ patch: { title: "Developer", description: "Platform role" } });

            // Assert
            expect(entity.title).toBe("Developer");
            expect(entity.description).toEqual("Platform role");
        });

        it("[case] - rejects updates to archived records", () => {
            // Arrange
            const entity = createPosition({ status: RecordStatus.ARCHIVED });
            entity.completePlacement(false);

            // Act
            const act = (): unknown => entity.update({ patch: { title: "Senior developer" } });

            // Assert
            expect(act).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });

    describe("[Behavior] - placement", () => {
        it("[case] - starts with a pending operation", () => {
            // Arrange

            // Act
            const entity = createPosition();
            const result = isUUID(entity.process!, "4");
            const act = (): unknown => entity.assertReady();

            // Assert
            expect(result).toBe(true);
            expect(entity.process).not.toBe(entity.id);
            expect(act).toThrow("OPERATION_PENDING");
        });

        it.each(["archive", "restore", "canPurge"] as const)("[case] - blocks %s while placement is pending", (method) => {
            // Arrange

            // Act
            const act = (): unknown => createPosition()[method]();

            // Assert
            expect(act).toThrow("OPERATION_PENDING");
        });

        it("[case] - blocks updates while placement is pending", () => {
            // Arrange

            // Act
            const act = (): unknown => createPosition().update({ patch: { title: "Updated" } });

            // Assert
            expect(act).toThrow("OPERATION_PENDING");
        });

        it.each([false, true])("[case] - completes initial placement with rejected=%s", (rejected) => {
            // Arrange
            const entity = createPosition();

            // Act
            entity.completePlacement(rejected);
            const act = (): unknown => entity.assertReady();

            // Assert
            expect(entity.status).toBe(RecordStatus.ACTIVE);
            expect(entity.process).toBeUndefined();
            expect(entity.previousStatus).toBeUndefined();
            expect(act).not.toThrow();
        });

        it.each([false, true])("[case] - completes restoration with rejected=%s", (rejected) => {
            // Arrange
            const entity = createPosition({ status: RecordStatus.ARCHIVED });

            // Act
            entity.completePlacement(false);
            entity.restore();
            const result = entity.status;
            const result1 = entity.previousStatus;
            const result2 = isUUID(entity.process!, "4");
            entity.completePlacement(rejected);

            // Assert
            expect(result).toBe(RecordStatus.ACTIVE);
            expect(result1).toBe(RecordStatus.ARCHIVED);
            expect(result2).toBe(true);
            expect(entity.status).toBe(rejected ? RecordStatus.ARCHIVED : RecordStatus.ACTIVE);
            expect(entity.previousStatus).toBeUndefined();
            expect(entity.process).toBeUndefined();
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe("[Behavior] - archive and purge", () => {
        it("[case] - rejects purging or restoring an active position", () => {
            // Arrange
            const entity = createPosition();
            entity.completePlacement(false);

            // Act
            const act = (): unknown => entity.canPurge();
            const act1 = (): unknown => entity.restore();

            // Assert
            expect(act).toThrow("CANNOT_PURGE_ACTIVE");
            expect(act1).toThrow("ALREADY_ACTIVE");
        });

        it("[case] - allows purging an archived position and rejects repeated archival", () => {
            // Arrange
            const entity = createPosition();
            entity.completePlacement(false);
            entity.archive();

            // Act
            const act = (): unknown => entity.archive();
            const act1 = (): unknown => entity.canPurge();

            // Assert
            expect(entity.status).toBe(RecordStatus.ARCHIVED);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            expect(act).toThrow("ALREADY_ARCHIVED");
            expect(act1).not.toThrow();
        });
    });
});
