import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { PositionAssignmentStatus, RecordStatus, EmployeeStatus } from "~context/enums";

import { PositionAssignment } from "./position-assignment.entity";

const organization = { id: "organization", realm: "realm" };

function stubEmployee(overrides?: Partial<Entities.Employee>): Entities.Employee {
    return { id: "employee", organization, ...overrides } as Entities.Employee;
}

function stubRequest(overrides?: Partial<Entities.HRRequest>): Entities.HRRequest {
    return { id: "request", organization, employee: stubEmployee(), ...overrides } as Entities.HRRequest;
}

function stubPosition(overrides?: Partial<Entities.Position>): Entities.Position {
    return {
        organization,
        status: RecordStatus.ACTIVE,
        department: "Engineering",
        team: "Platform",
        assertReady() {},
        ...overrides,
    } as Entities.Position;
}

function createPositionAssignment(overrides?: Partial<Entities.PositionAssignment.ConstructorProps>): PositionAssignment {
    return new PositionAssignment({
        organization,
        employee: stubEmployee({ status: EmployeeStatus.ACTIVE }),
        position: stubPosition(),
        positionTitle: "Developer",
        department: "Engineering",
        team: "Platform",
        validFrom: "2026-01-01",
        status: PositionAssignmentStatus.ACTIVE,
        placementSnapshot: {},
        fte: "1",
        ...overrides,
    });
}

describe("[Entity] - PositionAssignment", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createPositionAssignment();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
            const props: Partial<Entities.PositionAssignment.ConstructorProps> = {
                positionTitle: "Lead",
                department: "Engineering",
                team: "Core",
                grade: "L5",
                fte: "0.5",
                salaryAmount: "2500",
                salaryCurrency: "EUR",
                validFrom: "2026-01-01",
                validTo: "2026-06-01",
                status: PositionAssignmentStatus.CLOSED,
                placementSnapshot: { team: "Core" },
                organization,
                employee: stubEmployee(),
                position: stubPosition(),
                sourceRequest: stubRequest(),
                closedByRequest: stubRequest({ id: "closing" }),
            };

            // Act
            const entity = createPositionAssignment(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("[Method] - close", () => {
        it.each([false, true])("[case] - closes at the start date with request=%s", (withRequest) => {
            // Arrange
            const entity = createPositionAssignment();
            const request = withRequest ? stubRequest() : undefined;

            // Act
            entity.close({ validTo: "2026-01-01", request });

            // Assert
            expect(entity.status).toBe(PositionAssignmentStatus.CLOSED);
            expect(entity.validTo).toBe("2026-01-01");
            expect(entity.closedByRequest).toBe(request);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it.each([PositionAssignmentStatus.CLOSED, PositionAssignmentStatus.VOIDED])(
            "[case] - rejects status %s",
            (status) => {
                // Arrange

                // Act
                const act = (): unknown => createPositionAssignment({ status }).close({ validTo: "2026-02-01" });

                // Assert
                expect(act).toThrow("INVALID_STATUS");
            },
        );

        it("[case] - rejects an end before the start", () => {
            // Arrange

            // Act
            const act = (): unknown => createPositionAssignment().close({ validTo: "2025-12-31" });

            // Assert
            expect(act).toThrow("INVALID_PERIOD");
        });

        it.each(["organization", "employee"] as const)("[case] - rejects a mismatched request %s", (field) => {
            // Arrange
            const request = stubRequest();
            if (field === "organization") {
                request.organization = { id: "other", realm: "realm" };
            } else {
                request.employee = stubEmployee({ id: "other" });
            }

            // Act
            const act = (): unknown => createPositionAssignment().close({ validTo: "2026-02-01", request });

            // Assert
            expect(act).toThrow("REQUEST_MISMATCH");
        });
    });

    describe("[Method] - void", () => {
        it.each([PositionAssignmentStatus.ACTIVE, PositionAssignmentStatus.CLOSED])(
            "[case] - voids status %s",
            (status) => {
                // Arrange
                const entity = createPositionAssignment({ status });

                // Act
                entity.void();
                const act = (): unknown => entity.void();

                // Assert
                expect(entity.status).toBe(PositionAssignmentStatus.VOIDED);
                expect(entity.updatedAt).toBeInstanceOf(Date);
                expect(act).toThrow("INVALID_STATUS");
            },
        );
    });

    describe("[Method] - canCreate", () => {
        it("[case] - accepts matching active references", () => {
            // Arrange

            // Act
            const act = (): unknown => createPositionAssignment().canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it("[case] - propagates pending placement validation", () => {
            // Arrange
            const position = stubPosition({
                assertReady() {
                    throw new Error("OPERATION_PENDING");
                },
            });

            // Act
            const act = (): unknown => createPositionAssignment({ position }).canCreate();

            // Assert
            expect(act).toThrow("OPERATION_PENDING");
        });

        it.each(["employee", "position"] as const)("[case] - rejects a foreign %s", (field) => {
            // Arrange
            const entity = createPositionAssignment();
            entity[field].organization = { id: "other", realm: "realm" };

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("ORGANIZATION_MISMATCH");
        });

        it.each(["sourceRequest", "closedByRequest"] as const)("[case] - accepts matching %s", (field) => {
            // Arrange
            const entity = createPositionAssignment({ [field]: stubRequest() });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it.each(["sourceRequest", "closedByRequest"] as const)("[case] - rejects a foreign organization in %s", (field) => {
            // Arrange
            const entity = createPositionAssignment({ [field]: stubRequest() });
            entity[field]!.organization = { id: "other", realm: "realm" };

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("REQUEST_MISMATCH");
        });

        it.each(["sourceRequest", "closedByRequest"] as const)("[case] - rejects another employee in %s", (field) => {
            // Arrange
            const entity = createPositionAssignment({ [field]: stubRequest() });
            entity[field]!.organization = { id: "other", realm: "realm" };
            entity[field]!.organization = organization;
            entity[field]!.employee = stubEmployee({ id: "other" });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("REQUEST_MISMATCH");
        });
        it.each(["employee", "position"] as const)("[case] - rejects an inactive %s for active assignments", (field) => {
            // Arrange
            const entity = createPositionAssignment();
            if (field === "employee") {
                entity.employee.status = EmployeeStatus.TERMINATED;
            } else {
                entity.position.status = RecordStatus.ARCHIVED;
            }

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("INACTIVE_REFERENCE");
        });

        it.each(["employee", "position"] as const)("[case] - accepts an inactive %s for closed assignments", (field) => {
            // Arrange
            const entity = createPositionAssignment();
            if (field === "employee") {
                entity.employee.status = EmployeeStatus.TERMINATED;
            } else {
                entity.position.status = RecordStatus.ARCHIVED;
            }
            entity.status = PositionAssignmentStatus.CLOSED;

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it.each(["department", "team"] as const)("[case] - rejects mismatched %s", (field) => {
            // Arrange
            const entity = createPositionAssignment({ [field]: "other" });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("PLACEMENT_MISMATCH");
        });
    });
});
