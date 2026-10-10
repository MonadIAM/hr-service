import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { EmployeeStatus, RecordStatus } from "~context/enums";

import { Employee } from "./employee.entity";

const organization = { id: "organization", realm: "realm" };

function createTerms(): Entities.Employee.Hire.Props {
    return {
        workCalendar: { organization, status: RecordStatus.ACTIVE } as Entities.WorkCalendar,
        workSchedule: { organization, status: RecordStatus.ACTIVE } as Entities.WorkSchedule,
        leavePolicy: { organization, status: RecordStatus.ACTIVE } as Entities.LeavePolicy,
        employmentStartedOn: "2026-01-01",
        termsValidFrom: "2026-01-01",
        scheduleTimezone: "UTC",
    };
}

function createEmployee(overrides?: Partial<Entities.Employee.ConstructorProps>): Employee {
    return new Employee({
        organization,
        employeeNumber: "EMP-001",
        firstName: "Ada",
        lastName: "Lovelace",
        status: EmployeeStatus.DRAFT,
        termsRevision: 1,
        ...overrides,
    });
}

describe("[Entity] - Employee", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createEmployee();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
            const props: Partial<Entities.Employee.ConstructorProps> = {
                employeeNumber: "EMP-002",
                firstName: "Grace",
                lastName: "Hopper",
                middleName: "Brewster",
                workEmail: "grace@example.test",
                account: "account",
                status: EmployeeStatus.TERMINATED,
                termsRevision: 5,
                employmentStartedOn: "2026-01-01",
                employmentEndedOn: "2026-10-01",
                termsValidFrom: "2026-06-01",
                contractType: "fixed",
                contractEndsOn: "2026-12-31",
                scheduleTimezone: "UTC",
                scheduleAnchorDate: "2026-01-01",
                workCalendar: createTerms().workCalendar,
                workSchedule: createTerms().workSchedule,
                leavePolicy: createTerms().leavePolicy,
                hrBpEmployee: createEmployee({ status: EmployeeStatus.ACTIVE }),
                organization,
            };

            // Act
            const entity = createEmployee(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("[case] - initializes independent empty relation collections", () => {
            // Arrange

            // Act
            const entity = createEmployee();
            const other = createEmployee();
            const result = entity.positionAssignments.getItems();
            const result1 = entity.positionAssignments;
            const result2 = entity.assignedApprovalSteps.getItems();
            const result3 = entity.assignedApprovalSteps;
            const result4 = entity.approvalDecisions.getItems();
            const result5 = entity.approvalDecisions;
            const result6 = entity.leaveLedgerEntries.getItems();
            const result7 = entity.leaveLedgerEntries;
            const result8 = entity.initiatedHRRequests.getItems();
            const result9 = entity.initiatedHRRequests;
            const result10 = entity.employmentHistory.getItems();
            const result11 = entity.employmentHistory;
            const result12 = entity.employeesAsHRBP.getItems();
            const result13 = entity.employeesAsHRBP;
            const result14 = entity.hrRequests.getItems();
            const result15 = entity.hrRequests;
            const result16 = entity.absences.getItems();

            // Assert
            expect(result).toEqual([]);
            expect(result1).not.toBe(other.positionAssignments);
            expect(result2).toEqual([]);
            expect(result3).not.toBe(other.assignedApprovalSteps);
            expect(result4).toEqual([]);
            expect(result5).not.toBe(other.approvalDecisions);
            expect(result6).toEqual([]);
            expect(result7).not.toBe(other.leaveLedgerEntries);
            expect(result8).toEqual([]);
            expect(result9).not.toBe(other.initiatedHRRequests);
            expect(result10).toEqual([]);
            expect(result11).not.toBe(other.employmentHistory);
            expect(result12).toEqual([]);
            expect(result13).not.toBe(other.employeesAsHRBP);
            expect(result14).toEqual([]);
            expect(result15).not.toBe(other.hrRequests);
            expect(result16).toEqual([]);
            expect(entity.absences).not.toBe(other.absences);
        });
    });

    describe("[Method] - update", () => {
        it("[case] - updates changed fields and preserve omitted or undefined values", () => {
            // Arrange
            const entity = createEmployee({ firstName: "Ada", middleName: "Byron" });

            // Act
            entity.update({ patch: { firstName: "Grace", middleName: undefined } });

            // Assert
            expect(entity.firstName).toBe("Grace");
            expect(entity.middleName).toEqual("Byron");
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects an empty patch without changing metadata", () => {
            // Arrange
            const entity = createEmployee();

            // Act
            const act = (): unknown => entity.update({ patch: {} });

            // Assert
            expect(act).toThrow("EMPTY_UPDATE_PATCH");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - rejects unchanged and undefined-only patches", () => {
            // Arrange
            const entity = createEmployee({ firstName: "Ada" });

            // Act
            const act = (): unknown => entity.update({ patch: { firstName: "Ada" } });
            const act1 = (): unknown => entity.update({ patch: { firstName: undefined } });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
            expect(act1).toThrow("NO_CHANGES_DETECTED");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - applies changed values alongside unchanged fields", () => {
            // Arrange
            const entity = createEmployee({ firstName: "Ada" });

            // Act
            entity.update({ patch: { firstName: "Ada", middleName: "Byron" } });

            // Assert
            expect(entity.firstName).toBe("Ada");
            expect(entity.middleName).toEqual("Byron");
        });

        it("[case] - rejects updates to archived records", () => {
            // Arrange
            const entity = createEmployee({ status: EmployeeStatus.ARCHIVED });

            // Act
            const act = (): unknown => entity.update({ patch: { firstName: "Grace" } });

            // Assert
            expect(act).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });

    describe("[Behavior] - account", () => {
        it("[case] - links an account and rejects replacing it", () => {
            // Arrange
            const entity = createEmployee();

            // Act
            entity.linkAccount({ account: "account" });
            const act = (): unknown => entity.linkAccount({ account: "other" });

            // Assert
            expect(entity.account).toBe("account");
            expect(entity.updatedAt).toBeInstanceOf(Date);
            expect(act).toThrow("ACCOUNT_ALREADY_LINKED");
            expect(entity.account).toBe("account");
        });

        it("[case] - unlinks an account and rejects repeated removal", () => {
            // Arrange
            const entity = createEmployee();
            entity.linkAccount({ account: "account" });

            // Act
            entity.unlinkAccount();
            const act = (): unknown => entity.unlinkAccount();

            // Assert
            expect(entity.account).toBeUndefined();
            expect(act).toThrow("ACCOUNT_NOT_LINKED");
        });

        it("[case] - rejects account changes after archival", () => {
            // Arrange
            const entity = createEmployee({ status: EmployeeStatus.ARCHIVED });

            // Act
            const act = (): unknown => entity.linkAccount({ account: "account" });
            const act1 = (): unknown => entity.unlinkAccount();

            // Assert
            expect(act).toThrow("CANNOT_UPDATE_ARCHIVED");
            expect(act1).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });

    describe("[Method] - setHRBP", () => {
        it("[case] - assigns an active HRBP and rejects unchanged assignment", () => {
            // Arrange
            const entity = createEmployee();
            const employee = createEmployee({ status: EmployeeStatus.ACTIVE });

            // Act
            entity.setHRBP({ employee });
            const act = (): unknown => entity.setHRBP({ employee });

            // Assert
            expect(entity.hrBpEmployee).toBe(employee);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            expect(act).toThrow("NO_CHANGES_DETECTED");
        });

        it("[case] - clears an HRBP and rejects repeated removal", () => {
            // Arrange
            const entity = createEmployee();
            const employee = createEmployee({ status: EmployeeStatus.ACTIVE });
            entity.setHRBP({ employee });

            // Act
            entity.setHRBP({});
            const act = (): unknown => entity.setHRBP({});

            // Assert
            expect(entity.hrBpEmployee).toBeUndefined();
            expect(act).toThrow("NO_CHANGES_DETECTED");
        });

        it.each(["self", "organization", "inactive"])("[case] - rejects an invalid HRBP: %s", (reason) => {
            // Arrange
            const entity = createEmployee({ status: EmployeeStatus.ACTIVE });
            const employee = reason === "self" ? entity : createEmployee({ status: EmployeeStatus.ACTIVE });
            if (reason === "organization") {
                employee.organization = { id: "other", realm: "realm" };
            }
            if (reason === "inactive") {
                employee.status = EmployeeStatus.TERMINATED;
            }

            // Act
            const act = (): unknown => entity.setHRBP({ employee });

            // Assert
            expect(act).toThrow("INVALID_HRBP");
            expect(entity.hrBpEmployee).toBeUndefined();
        });

        it("[case] - rejects changes after archival", () => {
            // Arrange

            // Act
            const act = (): unknown => createEmployee({ status: EmployeeStatus.ARCHIVED }).setHRBP({});

            // Assert
            expect(act).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });

    describe("[Method] - hire", () => {
        it("[case] - hires a draft employee and assign all terms", () => {
            // Arrange
            const entity = createEmployee();
            const terms = {
                ...createTerms(),
                contractType: "fixed",
                contractEndsOn: "2027-01-01",
                scheduleAnchorDate: "2026-01-01",
            };

            // Act
            entity.hire(terms);

            // Assert
            expect(entity).toMatchObject({ ...terms, status: EmployeeStatus.ACTIVE, termsRevision: 1 });
            expect(entity.employmentEndedOn).toBeUndefined();
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rehires after termination and increment the revision", () => {
            // Arrange
            const entity = createEmployee({
                status: EmployeeStatus.TERMINATED,
                employmentEndedOn: "2025-12-31",
                termsRevision: 4,
            });

            // Act
            entity.hire(createTerms());

            // Assert
            expect(entity.status).toBe(EmployeeStatus.ACTIVE);
            expect(entity.termsRevision).toBe(5);
            expect(entity.employmentEndedOn).toBeUndefined();
        });

        it.each(["2025-12-30", "2025-12-31"])(
            "[case] - rejects rehire on %s before or at termination",
            (employmentStartedOn) => {
                // Arrange
                const entity = createEmployee({ status: EmployeeStatus.TERMINATED, employmentEndedOn: "2025-12-31" });

                // Act
                const act = (): unknown => entity.hire({ ...createTerms(), employmentStartedOn });

                // Assert
                expect(act).toThrow("INVALID_PERIOD");
            },
        );
        it.each([EmployeeStatus.ACTIVE, EmployeeStatus.ARCHIVED])("[case] - rejects hiring in status %s", (status) => {
            // Arrange

            // Act
            const act = (): unknown => createEmployee({ status }).hire(createTerms());

            // Assert
            expect(act).toThrow("INVALID_STATUS");
        });
    });

    describe("[Method] - changeTerms", () => {
        it("[case] - replaces terms at the current boundary and increment the revision", () => {
            // Arrange
            const entity = createEmployee();

            // Act
            entity.hire({ ...createTerms(), contractType: "fixed", contractEndsOn: "2027-01-01" });
            const terms = createTerms();
            entity.changeTerms(terms);

            // Assert
            expect(entity).toMatchObject({ ...terms, termsRevision: 2 });
            expect(entity.contractEndsOn).toBeUndefined();
            expect(entity.contractType).toBeUndefined();
        });

        it("[case] - rejects backdated terms", () => {
            // Arrange
            const entity = createEmployee();
            entity.hire(createTerms());

            // Act
            const act = (): unknown => entity.changeTerms({ ...createTerms(), termsValidFrom: "2025-12-31" });

            // Assert
            expect(act).toThrow("INVALID_PERIOD");
            expect(entity.termsRevision).toBe(1);
        });

        it.each([EmployeeStatus.DRAFT, EmployeeStatus.TERMINATED, EmployeeStatus.ARCHIVED])(
            "[case] - rejects status %s",
            (status) => {
                // Arrange

                // Act
                const act = (): unknown => createEmployee({ status }).changeTerms(createTerms());

                // Assert
                expect(act).toThrow("INVALID_STATUS");
            },
        );
    });

    describe.each(["hire", "changeTerms"] as const)("[Behavior] - %s terms validation", (method) => {
        it.each(["workCalendar", "workSchedule", "leavePolicy"] as const)("[case] - rejects a foreign %s", (field) => {
            // Arrange
            const entity = createEmployee();
            if (method === "changeTerms") {
                entity.hire(createTerms());
            }
            const terms = createTerms();
            terms[field].organization = { id: "other", realm: "realm" };

            // Act
            const act = (): unknown => entity[method](terms);

            // Assert
            expect(act).toThrow("ORGANIZATION_MISMATCH");
        });

        it.each(["workCalendar", "workSchedule", "leavePolicy"] as const)("[case] - rejects an archived %s", (field) => {
            // Arrange
            const entity = createEmployee();
            if (method === "changeTerms") {
                entity.hire(createTerms());
            }
            const terms = createTerms();
            terms[field].organization = { id: "other", realm: "realm" };
            terms[field].organization = organization;
            terms[field].status = RecordStatus.ARCHIVED;

            // Act
            const act = (): unknown => entity[method](terms);

            // Assert
            expect(act).toThrow("ARCHIVED_TERMS");
            expect(entity.termsRevision).toBe(1);
        });
    });

    describe("[Method] - terminate", () => {
        it("[case] - terminates at the terms boundary", () => {
            // Arrange
            const entity = createEmployee();

            // Act
            entity.hire(createTerms());
            entity.terminate({ employmentEndedOn: "2026-01-01" });

            // Assert
            expect(entity).toMatchObject({
                status: EmployeeStatus.TERMINATED,
                employmentEndedOn: "2026-01-01",
                termsValidFrom: "2026-01-01",
                termsRevision: 2,
            });
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it.each(["2025-12-31", "2026-01-15"])(
            "[case] - rejects termination before employment or current terms: %s",
            (employmentEndedOn) => {
                // Arrange
                const entity = createEmployee({
                    status: EmployeeStatus.ACTIVE,
                    employmentStartedOn: "2026-01-01",
                    termsValidFrom: "2026-02-01",
                });

                // Act
                const act = (): unknown => entity.terminate({ employmentEndedOn });

                // Assert
                expect(act).toThrow("INVALID_PERIOD");
            },
        );
        it.each([EmployeeStatus.DRAFT, EmployeeStatus.TERMINATED, EmployeeStatus.ARCHIVED])(
            "[case] - rejects status %s",
            (status) => {
                // Arrange

                // Act
                const act = (): unknown => createEmployee({ status }).terminate({ employmentEndedOn: "2026-01-01" });

                // Assert
                expect(act).toThrow("INVALID_STATUS");
            },
        );
    });

    describe("[Behavior] - archive and restore", () => {
        it.each([EmployeeStatus.DRAFT, EmployeeStatus.TERMINATED])(
            "[case] - restores the previous employment state %s",
            (status) => {
                // Arrange
                const entity = createEmployee({
                    status,
                    employmentEndedOn: status === EmployeeStatus.TERMINATED ? "2025-12-31" : undefined,
                });

                // Act
                entity.archive();
                const result = entity.status;
                entity.restore();

                // Assert
                expect(result).toBe(EmployeeStatus.ARCHIVED);
                expect(entity.status).toBe(status);
                expect(entity.updatedAt).toBeInstanceOf(Date);
            },
        );
        it.each([EmployeeStatus.ACTIVE, EmployeeStatus.ARCHIVED])("[case] - rejects archival in status %s", (status) => {
            // Arrange

            // Act
            const act = (): unknown => createEmployee({ status }).archive();

            // Assert
            expect(act).toThrow("INVALID_STATUS");
        });

        it.each([EmployeeStatus.DRAFT, EmployeeStatus.ACTIVE, EmployeeStatus.TERMINATED])(
            "[case] - rejects restoration in status %s",
            (status) => {
                // Arrange

                // Act
                const act = (): unknown => createEmployee({ status }).restore();

                // Assert
                expect(act).toThrow("INVALID_STATUS");
            },
        );
    });

    describe("[Method] - canCreate", () => {
        it("[case] - allows omitted optional relations and matching terms", () => {
            // Arrange

            // Act
            const act = (): unknown => createEmployee().canCreate();
            const act1 = (): unknown => createEmployee(createTerms()).canCreate();

            // Assert
            expect(act).not.toThrow();
            expect(act1).not.toThrow();
        });

        it.each(["workCalendar", "workSchedule", "leavePolicy"] as const)("[case] - rejects a foreign %s", (field) => {
            // Arrange
            const terms = createTerms();
            terms[field].organization = { id: "other", realm: "realm" };

            // Act
            const act = (): unknown => createEmployee(terms).canCreate();

            // Assert
            expect(act).toThrow("ORGANIZATION_MISMATCH");
        });

        it("[case] - rejects an inactive HRBP", () => {
            // Arrange

            // Act
            const act = (): unknown => createEmployee({ hrBpEmployee: createEmployee() }).canCreate();

            // Assert
            expect(act).toThrow("INVALID_HRBP");
        });
    });
});
