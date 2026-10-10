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

describe("[Entity] - HRApprovalStep", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createHRApprovalStep();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
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

            // Act
            const entity = createHRApprovalStep(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe.each([
        ["activate", HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE],
        ["approve", HRApprovalStatus.ACTIVE, HRApprovalStatus.APPROVED],
        ["reject", HRApprovalStatus.ACTIVE, HRApprovalStatus.REJECTED],
        ["returnForRevision", HRApprovalStatus.ACTIVE, HRApprovalStatus.RETURNED],
    ] as const)("[Method] - %s", (method, initial, expected) => {
        it("[case] - transitions a current step", () => {
            // Arrange
            const entity = createHRApprovalStep({ status: initial });

            // Act
            entity[method]();

            // Assert
            expect(entity.status).toBe(expected);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            if (method === "activate") {
                expect(entity.resolvedAt).toBeUndefined();
            } else {
                expect(entity.resolvedAt).toBe(entity.updatedAt);
            }
        });

        it.each(["organization", "revision", "request", "status", "assignee"])(
            "[case] - rejects invalid %s without changing the step",
            (reason) => {
                // Arrange
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

                // Act
                const act = (): unknown => entity[method]();

                // Assert
                expect(act).toThrow(errors[reason as keyof typeof errors]);
                expect(entity.status).toBe(status);
                expect(entity.updatedAt).toBeUndefined();
                expect(entity.resolvedAt).toBeUndefined();
            },
        );
    });

    describe("[Method] - reassign", () => {
        it.each([HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE])("[case] - reassigns status %s", (status) => {
            // Arrange
            const entity = createHRApprovalStep({ status });
            const employee = stubEmployee({ id: "replacement", status: EmployeeStatus.ACTIVE });

            // Act
            entity.reassign({ employee });

            // Assert
            expect(entity.assigneeEmployee).toBe(employee);
            expect(entity.status).toBe(status);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it.each(["organization", "revision", "request", "status", "same", "foreign", "inactive"])(
            "[case] - rejects %s",
            (reason) => {
                // Arrange
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

                // Act
                const act = (): unknown => entity.reassign({ employee });

                // Assert
                expect(act).toThrow(errors[reason as keyof typeof errors]);
                expect(entity.assigneeEmployee.id).toBe("employee");
            },
        );
    });

    describe("[Method] - skip", () => {
        it.each([HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE])("[case] - skips status %s", (status) => {
            // Arrange
            const entity = createHRApprovalStep({ status });

            // Act
            entity.skip();

            // Assert
            expect(entity.status).toBe(HRApprovalStatus.SKIPPED);
            expect(entity.resolvedAt).toBeInstanceOf(Date);
            expect(entity.resolvedAt).toBe(entity.updatedAt);
        });

        it.each([
            HRApprovalStatus.APPROVED,
            HRApprovalStatus.REJECTED,
            HRApprovalStatus.RETURNED,
            HRApprovalStatus.SKIPPED,
        ])("[case] - rejects resolved status %s", (status) => {
            // Arrange

            // Act
            const act = (): unknown => createHRApprovalStep({ status }).skip();

            // Assert
            expect(act).toThrow("INVALID_STATUS");
        });
    });

    describe("[Method] - canCreate", () => {
        it("[case] - allows a current step", () => {
            // Arrange

            // Act
            const act = (): unknown => createHRApprovalStep().canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it.each(["request", "assigneeEmployee"] as const)("[case] - rejects a foreign %s", (field) => {
            // Arrange
            const entity = createHRApprovalStep();
            entity[field].organization = { id: "other", realm: "realm" };

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("ORGANIZATION_MISMATCH");
        });

        it("[case] - rejects stale revisions and inactive assignees", () => {
            // Arrange

            // Act
            const act = (): unknown => createHRApprovalStep({ requestRevision: 1 }).canCreate();
            const act1 = (): unknown =>
                createHRApprovalStep({ assigneeEmployee: stubEmployee({ status: EmployeeStatus.DRAFT }) }).canCreate();

            // Assert
            expect(act).toThrow("STALE_REVISION");
            expect(act1).toThrow("INACTIVE_ASSIGNEE");
        });
    });
});
