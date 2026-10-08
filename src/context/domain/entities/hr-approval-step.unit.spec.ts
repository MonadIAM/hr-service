import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { HRApprovalStatus, HRRequestStatus, EmployeeStatus } from "~context/enums";

import { HRApprovalStep } from "./hr-approval-step.entity";

const organization = { id: "organization", realm: "realm" };

function stubEmployee(overrides?: Partial<Entities.Employee>): Entities.Employee {
    return { id: "employee", organization, ...overrides } as Entities.Employee;
}

function stubRequest(overrides?: Partial<Entities.HRRequest>): Entities.HRRequest {
    return { id: "request", organization, employee: stubEmployee(), ...overrides } as Entities.HRRequest;
}

function createHRApprovalStep(overrides?: Partial<Entities.HRApprovalStep.ConstructorProps>): HRApprovalStep {
    return new HRApprovalStep({
        organization,
        request: stubRequest({ status: HRRequestStatus.SUBMITTED, revision: 2 }),
        assigneeEmployee: stubEmployee({ status: EmployeeStatus.ACTIVE }),
        requestRevision: 2,
        status: HRApprovalStatus.WAITING,
        ordinal: 1,
        name: "Manager approval",
        ...overrides,
    });
}

describe("HRApprovalStep Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createHRApprovalStep();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
            const props: Partial<Entities.HRApprovalStep.ConstructorProps> = {
                name: "HR approval",
                ordinal: 2,
                requestRevision: 3,
                status: HRApprovalStatus.APPROVED,
                dueAt: new Date("2026-10-01T00:00:00Z"),
                resolvedAt: new Date("2026-09-30T00:00:00Z"),
                organization,
                request: stubRequest(),
                assigneeEmployee: stubEmployee(),
            };
            const entity = createHRApprovalStep(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe.each([
        ["activate", HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE],
        ["approve", HRApprovalStatus.ACTIVE, HRApprovalStatus.APPROVED],
        ["reject", HRApprovalStatus.ACTIVE, HRApprovalStatus.REJECTED],
        ["returnForRevision", HRApprovalStatus.ACTIVE, HRApprovalStatus.RETURNED],
    ] as const)("%s", (method, initial, expected) => {
        it("should transition a current step", () => {
            const entity = createHRApprovalStep({ status: initial });
            entity[method]();

            expect(entity.status).toBe(expected);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            if (method === "activate") {
                expect(entity.resolvedAt).toBeUndefined();
            } else {
                expect(entity.resolvedAt).toBe(entity.updatedAt);
            }
        });

        it.each(["organization", "revision", "request", "status", "assignee"])(
            "should reject invalid %s without changing the step",
            (reason) => {
                const entity = createHRApprovalStep({ status: initial });
                const errors = {
                    organization: "ORGANIZATION_MISMATCH",
                    revision: "STALE_REVISION",
                    request: "INVALID_REQUEST_STATUS",
                    status: "INVALID_STATUS",
                    assignee: "INACTIVE_ASSIGNEE",
                };
                if (reason === "organization") {
                    entity.request.organization = { id: "other", realm: "realm" };
                }
                if (reason === "revision") {
                    entity.request.revision++;
                }
                if (reason === "request") {
                    entity.request.status = HRRequestStatus.DRAFT;
                }
                if (reason === "status") {
                    entity.status = HRApprovalStatus.SKIPPED;
                }
                if (reason === "assignee") {
                    entity.assigneeEmployee.status = EmployeeStatus.TERMINATED;
                }
                const status = entity.status;

                expect(() => entity[method]()).toThrow(errors[reason as keyof typeof errors]);
                expect(entity.status).toBe(status);
                expect(entity.updatedAt).toBeUndefined();
                expect(entity.resolvedAt).toBeUndefined();
            },
        );
    });

    describe("reassign", () => {
        it.each([HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE])("should reassign status %s", (status) => {
            const entity = createHRApprovalStep({ status });
            const employee = stubEmployee({ id: "replacement", status: EmployeeStatus.ACTIVE });
            entity.reassign({ employee });

            expect(entity.assigneeEmployee).toBe(employee);
            expect(entity.status).toBe(status);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it.each(["organization", "revision", "request", "status", "same", "foreign", "inactive"])(
            "should reject %s",
            (reason) => {
                const entity = createHRApprovalStep();
                const employee = stubEmployee({ id: "replacement", status: EmployeeStatus.ACTIVE });
                const errors = {
                    organization: "ORGANIZATION_MISMATCH",
                    revision: "STALE_REVISION",
                    request: "INVALID_REQUEST_STATUS",
                    status: "INVALID_STATUS",
                    same: "NO_CHANGES_DETECTED",
                    foreign: "ORGANIZATION_MISMATCH",
                    inactive: "INACTIVE_ASSIGNEE",
                };
                if (reason === "organization") {
                    entity.request.organization = { id: "other", realm: "realm" };
                }
                if (reason === "revision") {
                    entity.request.revision++;
                }
                if (reason === "request") {
                    entity.request.status = HRRequestStatus.DRAFT;
                }
                if (reason === "status") {
                    entity.status = HRApprovalStatus.APPROVED;
                }
                if (reason === "same") {
                    employee.id = entity.assigneeEmployee.id;
                }
                if (reason === "foreign") {
                    employee.organization = { id: "other", realm: "realm" };
                }
                if (reason === "inactive") {
                    employee.status = EmployeeStatus.ARCHIVED;
                }
                expect(() => entity.reassign({ employee })).toThrow(errors[reason as keyof typeof errors]);
                expect(entity.assigneeEmployee.id).toBe("employee");
            },
        );
    });

    describe("skip", () => {
        it.each([HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE])("should skip status %s", (status) => {
            const entity = createHRApprovalStep({ status });
            entity.skip();

            expect(entity.status).toBe(HRApprovalStatus.SKIPPED);
            expect(entity.resolvedAt).toBeInstanceOf(Date);
            expect(entity.resolvedAt).toBe(entity.updatedAt);
        });

        it.each([
            HRApprovalStatus.APPROVED,
            HRApprovalStatus.REJECTED,
            HRApprovalStatus.RETURNED,
            HRApprovalStatus.SKIPPED,
        ])("should reject resolved status %s", (status) => {
            expect(() => createHRApprovalStep({ status }).skip()).toThrow("INVALID_STATUS");
        });
    });

    describe("canCreate", () => {
        it("should allow a current step", () => {
            expect(() => createHRApprovalStep().canCreate()).not.toThrow();
        });

        it.each(["request", "assigneeEmployee"] as const)("should reject a foreign %s", (field) => {
            const entity = createHRApprovalStep();
            entity[field].organization = { id: "other", realm: "realm" };

            expect(() => entity.canCreate()).toThrow("ORGANIZATION_MISMATCH");
        });

        it("should reject stale revisions and inactive assignees", () => {
            expect(() => createHRApprovalStep({ requestRevision: 1 }).canCreate()).toThrow("STALE_REVISION");
            expect(() =>
                createHRApprovalStep({ assigneeEmployee: stubEmployee({ status: EmployeeStatus.DRAFT }) }).canCreate(),
            ).toThrow("INACTIVE_ASSIGNEE");
        });
    });
});
