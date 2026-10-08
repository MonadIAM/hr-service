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

describe("Employee Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createEmployee();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
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
            const entity = createEmployee(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("should initialize independent empty relation collections", () => {
            const entity = createEmployee();
            const other = createEmployee();

            expect(entity.positionAssignments.getItems()).toEqual([]);
            expect(entity.positionAssignments).not.toBe(other.positionAssignments);
            expect(entity.assignedApprovalSteps.getItems()).toEqual([]);
            expect(entity.assignedApprovalSteps).not.toBe(other.assignedApprovalSteps);
            expect(entity.approvalDecisions.getItems()).toEqual([]);
            expect(entity.approvalDecisions).not.toBe(other.approvalDecisions);
            expect(entity.leaveLedgerEntries.getItems()).toEqual([]);
            expect(entity.leaveLedgerEntries).not.toBe(other.leaveLedgerEntries);
            expect(entity.initiatedHRRequests.getItems()).toEqual([]);
            expect(entity.initiatedHRRequests).not.toBe(other.initiatedHRRequests);
            expect(entity.employmentHistory.getItems()).toEqual([]);
            expect(entity.employmentHistory).not.toBe(other.employmentHistory);
            expect(entity.employeesAsHRBP.getItems()).toEqual([]);
            expect(entity.employeesAsHRBP).not.toBe(other.employeesAsHRBP);
            expect(entity.hrRequests.getItems()).toEqual([]);
            expect(entity.hrRequests).not.toBe(other.hrRequests);
            expect(entity.absences.getItems()).toEqual([]);
            expect(entity.absences).not.toBe(other.absences);
        });
    });

    describe("update", () => {
        it("should update changed fields and preserve omitted or undefined values", () => {
            const entity = createEmployee({ firstName: "Ada", middleName: "Byron" });

            entity.update({ patch: { firstName: "Grace", middleName: undefined } });

            expect(entity.firstName).toBe("Grace");
            expect(entity.middleName).toEqual("Byron");
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject an empty patch without changing metadata", () => {
            const entity = createEmployee();

            expect(() => entity.update({ patch: {} })).toThrow("EMPTY_UPDATE_PATCH");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should reject unchanged and undefined-only patches", () => {
            const entity = createEmployee({ firstName: "Ada" });

            expect(() => entity.update({ patch: { firstName: "Ada" } })).toThrow("NO_CHANGES_DETECTED");
            expect(() => entity.update({ patch: { firstName: undefined } })).toThrow("NO_CHANGES_DETECTED");
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should apply changed values alongside unchanged fields", () => {
            const entity = createEmployee({ firstName: "Ada" });

            entity.update({ patch: { firstName: "Ada", middleName: "Byron" } });

            expect(entity.firstName).toBe("Ada");
            expect(entity.middleName).toEqual("Byron");
        });

        it("should reject updates to archived records", () => {
            const entity = createEmployee({ status: EmployeeStatus.ARCHIVED });

            expect(() => entity.update({ patch: { firstName: "Grace" } })).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });

    describe("account", () => {
        it("should link and unlink an account", () => {
            const entity = createEmployee();
            entity.linkAccount({ account: "account" });

            expect(entity.account).toBe("account");
            expect(entity.updatedAt).toBeInstanceOf(Date);
            expect(() => entity.linkAccount({ account: "other" })).toThrow("ACCOUNT_ALREADY_LINKED");
            expect(entity.account).toBe("account");
            entity.unlinkAccount();

            expect(entity.account).toBeUndefined();
            expect(() => entity.unlinkAccount()).toThrow("ACCOUNT_NOT_LINKED");
        });

        it("should reject account changes after archival", () => {
            const entity = createEmployee({ status: EmployeeStatus.ARCHIVED });

            expect(() => entity.linkAccount({ account: "account" })).toThrow("CANNOT_UPDATE_ARCHIVED");
            expect(() => entity.unlinkAccount()).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });

    describe("setHRBP", () => {
        it("should assign and clear an active HRBP", () => {
            const entity = createEmployee();
            const employee = createEmployee({ status: EmployeeStatus.ACTIVE });
            entity.setHRBP({ employee });

            expect(entity.hrBpEmployee).toBe(employee);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            expect(() => entity.setHRBP({ employee })).toThrow("NO_CHANGES_DETECTED");
            entity.setHRBP({});

            expect(entity.hrBpEmployee).toBeUndefined();
            expect(() => entity.setHRBP({})).toThrow("NO_CHANGES_DETECTED");
        });

        it.each(["self", "organization", "inactive"])("should reject an invalid HRBP: %s", (reason) => {
            const entity = createEmployee({ status: EmployeeStatus.ACTIVE });
            const employee = reason === "self" ? entity : createEmployee({ status: EmployeeStatus.ACTIVE });
            if (reason === "organization") {
                employee.organization = { id: "other", realm: "realm" };
            }
            if (reason === "inactive") {
                employee.status = EmployeeStatus.TERMINATED;
            }
            expect(() => entity.setHRBP({ employee })).toThrow("INVALID_HRBP");
            expect(entity.hrBpEmployee).toBeUndefined();
        });

        it("should reject changes after archival", () => {
            expect(() => createEmployee({ status: EmployeeStatus.ARCHIVED }).setHRBP({})).toThrow("CANNOT_UPDATE_ARCHIVED");
        });
    });

    describe("hire", () => {
        it("should hire a draft employee and assign all terms", () => {
            const entity = createEmployee();
            const terms = {
                ...createTerms(),
                contractType: "fixed",
                contractEndsOn: "2027-01-01",
                scheduleAnchorDate: "2026-01-01",
            };
            entity.hire(terms);

            expect(entity).toMatchObject({ ...terms, status: EmployeeStatus.ACTIVE, termsRevision: 1 });
            expect(entity.employmentEndedOn).toBeUndefined();
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should rehire after termination and increment the revision", () => {
            const entity = createEmployee({
                status: EmployeeStatus.TERMINATED,
                employmentEndedOn: "2025-12-31",
                termsRevision: 4,
            });
            entity.hire(createTerms());

            expect(entity.status).toBe(EmployeeStatus.ACTIVE);
            expect(entity.termsRevision).toBe(5);
            expect(entity.employmentEndedOn).toBeUndefined();
        });

        it.each(["2025-12-30", "2025-12-31"])(
            "should reject rehire on %s before or at termination",
            (employmentStartedOn) => {
                const entity = createEmployee({ status: EmployeeStatus.TERMINATED, employmentEndedOn: "2025-12-31" });

                expect(() => entity.hire({ ...createTerms(), employmentStartedOn })).toThrow("INVALID_PERIOD");
            },
        );
        it.each([EmployeeStatus.ACTIVE, EmployeeStatus.ARCHIVED])("should reject hiring in status %s", (status) => {
            expect(() => createEmployee({ status }).hire(createTerms())).toThrow("INVALID_STATUS");
        });
    });

    describe("changeTerms", () => {
        it("should replace terms at the current boundary and increment the revision", () => {
            const entity = createEmployee();
            entity.hire({ ...createTerms(), contractType: "fixed", contractEndsOn: "2027-01-01" });
            const terms = createTerms();
            entity.changeTerms(terms);

            expect(entity).toMatchObject({ ...terms, termsRevision: 2 });
            expect(entity.contractEndsOn).toBeUndefined();
            expect(entity.contractType).toBeUndefined();
        });

        it("should reject backdated terms", () => {
            const entity = createEmployee();
            entity.hire(createTerms());

            expect(() => entity.changeTerms({ ...createTerms(), termsValidFrom: "2025-12-31" })).toThrow("INVALID_PERIOD");
            expect(entity.termsRevision).toBe(1);
        });

        it.each([EmployeeStatus.DRAFT, EmployeeStatus.TERMINATED, EmployeeStatus.ARCHIVED])(
            "should reject status %s",
            (status) => {
                expect(() => createEmployee({ status }).changeTerms(createTerms())).toThrow("INVALID_STATUS");
            },
        );
    });

    describe.each(["hire", "changeTerms"] as const)("%s terms validation", (method) => {
        it.each(["workCalendar", "workSchedule", "leavePolicy"] as const)(
            "should reject a foreign or archived %s",
            (field) => {
                const entity = createEmployee();
                if (method === "changeTerms") {
                    entity.hire(createTerms());
                }
                const terms = createTerms();
                terms[field].organization = { id: "other", realm: "realm" };

                expect(() => entity[method](terms)).toThrow("ORGANIZATION_MISMATCH");
                terms[field].organization = organization;
                terms[field].status = RecordStatus.ARCHIVED;

                expect(() => entity[method](terms)).toThrow("ARCHIVED_TERMS");
                expect(entity.termsRevision).toBe(1);
            },
        );
    });

    describe("terminate", () => {
        it("should terminate at the terms boundary", () => {
            const entity = createEmployee();
            entity.hire(createTerms());
            entity.terminate({ employmentEndedOn: "2026-01-01" });

            expect(entity).toMatchObject({
                status: EmployeeStatus.TERMINATED,
                employmentEndedOn: "2026-01-01",
                termsValidFrom: "2026-01-01",
                termsRevision: 2,
            });

            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it.each(["2025-12-31", "2026-01-15"])(
            "should reject termination before employment or current terms: %s",
            (employmentEndedOn) => {
                const entity = createEmployee({
                    status: EmployeeStatus.ACTIVE,
                    employmentStartedOn: "2026-01-01",
                    termsValidFrom: "2026-02-01",
                });

                expect(() => entity.terminate({ employmentEndedOn })).toThrow("INVALID_PERIOD");
            },
        );
        it.each([EmployeeStatus.DRAFT, EmployeeStatus.TERMINATED, EmployeeStatus.ARCHIVED])(
            "should reject status %s",
            (status) => {
                expect(() => createEmployee({ status }).terminate({ employmentEndedOn: "2026-01-01" })).toThrow(
                    "INVALID_STATUS",
                );
            },
        );
    });

    describe("archive and restore", () => {
        it.each([EmployeeStatus.DRAFT, EmployeeStatus.TERMINATED])(
            "should restore the previous employment state %s",
            (status) => {
                const entity = createEmployee({
                    status,
                    employmentEndedOn: status === EmployeeStatus.TERMINATED ? "2025-12-31" : undefined,
                });
                entity.archive();

                expect(entity.status).toBe(EmployeeStatus.ARCHIVED);
                entity.restore();

                expect(entity.status).toBe(status);
                expect(entity.updatedAt).toBeInstanceOf(Date);
            },
        );
        it.each([EmployeeStatus.ACTIVE, EmployeeStatus.ARCHIVED])("should reject archival in status %s", (status) => {
            expect(() => createEmployee({ status }).archive()).toThrow("INVALID_STATUS");
        });

        it.each([EmployeeStatus.DRAFT, EmployeeStatus.ACTIVE, EmployeeStatus.TERMINATED])(
            "should reject restoration in status %s",
            (status) => {
                expect(() => createEmployee({ status }).restore()).toThrow("INVALID_STATUS");
            },
        );
    });

    describe("canCreate", () => {
        it("should allow omitted optional relations and matching terms", () => {
            expect(() => createEmployee().canCreate()).not.toThrow();
            expect(() => createEmployee(createTerms()).canCreate()).not.toThrow();
        });

        it.each(["workCalendar", "workSchedule", "leavePolicy"] as const)("should reject a foreign %s", (field) => {
            const terms = createTerms();
            terms[field].organization = { id: "other", realm: "realm" };

            expect(() => createEmployee(terms).canCreate()).toThrow("ORGANIZATION_MISMATCH");
        });

        it("should reject an inactive HRBP", () => {
            expect(() => createEmployee({ hrBpEmployee: createEmployee() }).canCreate()).toThrow("INVALID_HRBP");
        });
    });
});
