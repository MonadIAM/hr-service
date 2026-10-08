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

describe("PositionAssignment Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createPositionAssignment();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
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
            const entity = createPositionAssignment(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("close", () => {
        it.each([false, true])("should close at the start date with request=%s", (withRequest) => {
            const entity = createPositionAssignment();
            const request = withRequest ? stubRequest() : undefined;
            entity.close({ validTo: "2026-01-01", request });

            expect(entity.status).toBe(PositionAssignmentStatus.CLOSED);
            expect(entity.validTo).toBe("2026-01-01");
            expect(entity.closedByRequest).toBe(request);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it.each([PositionAssignmentStatus.CLOSED, PositionAssignmentStatus.VOIDED])("should reject status %s", (status) => {
            expect(() => createPositionAssignment({ status }).close({ validTo: "2026-02-01" })).toThrow("INVALID_STATUS");
        });

        it("should reject an end before the start", () => {
            expect(() => createPositionAssignment().close({ validTo: "2025-12-31" })).toThrow("INVALID_PERIOD");
        });

        it.each(["organization", "employee"] as const)("should reject a mismatched request %s", (field) => {
            const request = stubRequest();
            if (field === "organization") {
                request.organization = { id: "other", realm: "realm" };
            } else {
                request.employee = stubEmployee({ id: "other" });
            }
            expect(() => createPositionAssignment().close({ validTo: "2026-02-01", request })).toThrow("REQUEST_MISMATCH");
        });
    });

    describe("void", () => {
        it.each([PositionAssignmentStatus.ACTIVE, PositionAssignmentStatus.CLOSED])("should void status %s", (status) => {
            const entity = createPositionAssignment({ status });
            entity.void();

            expect(entity.status).toBe(PositionAssignmentStatus.VOIDED);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            expect(() => entity.void()).toThrow("INVALID_STATUS");
        });
    });

    describe("canCreate", () => {
        it("should accept matching active references", () => {
            expect(() => createPositionAssignment().canCreate()).not.toThrow();
        });

        it("should propagate pending placement validation", () => {
            const position = stubPosition({
                assertReady() {
                    throw new Error("OPERATION_PENDING");
                },
            });

            expect(() => createPositionAssignment({ position }).canCreate()).toThrow("OPERATION_PENDING");
        });

        it.each(["employee", "position"] as const)("should reject a foreign %s", (field) => {
            const entity = createPositionAssignment();
            entity[field].organization = { id: "other", realm: "realm" };

            expect(() => entity.canCreate()).toThrow("ORGANIZATION_MISMATCH");
        });

        it.each(["sourceRequest", "closedByRequest"] as const)(
            "should validate both organization and employee of %s",
            (field) => {
                const entity = createPositionAssignment({ [field]: stubRequest() });

                expect(() => entity.canCreate()).not.toThrow();
                entity[field]!.organization = { id: "other", realm: "realm" };

                expect(() => entity.canCreate()).toThrow("REQUEST_MISMATCH");
                entity[field]!.organization = organization;
                entity[field]!.employee = stubEmployee({ id: "other" });

                expect(() => entity.canCreate()).toThrow("REQUEST_MISMATCH");
            },
        );
        it.each(["employee", "position"] as const)("should reject an inactive %s for active assignments", (field) => {
            const entity = createPositionAssignment();
            if (field === "employee") {
                entity.employee.status = EmployeeStatus.TERMINATED;
            } else {
                entity.position.status = RecordStatus.ARCHIVED;
            }
            expect(() => entity.canCreate()).toThrow("INACTIVE_REFERENCE");
            entity.status = PositionAssignmentStatus.CLOSED;

            expect(() => entity.canCreate()).not.toThrow();
        });

        it.each(["department", "team"] as const)("should reject mismatched %s", (field) => {
            const entity = createPositionAssignment({ [field]: "other" });

            expect(() => entity.canCreate()).toThrow("PLACEMENT_MISMATCH");
        });
    });
});
