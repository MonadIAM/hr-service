import { Collection } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { EmployeeStatus, RecordStatus } from "~context/enums";
import { Exception } from "~common/exceptions";

export class Employee implements Entities.Employee.Contract {
    private static readonly dictionaryPath = "entities.employee";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public employmentStartedOn?: string;
    public scheduleAnchorDate?: string;
    public employmentEndedOn?: string;
    public scheduleTimezone?: string;
    public termsValidFrom?: string;
    public contractEndsOn?: string;
    public status: EmployeeStatus;
    public employeeNumber: string;
    public contractType?: string;
    public termsRevision: number;
    public middleName?: string;
    public workEmail?: string;
    public firstName: string;
    public lastName: string;
    public account?: string;

    public workCalendar?: Entities.WorkCalendar;
    public workSchedule?: Entities.WorkSchedule;
    public organization: Entities.Organization;
    public leavePolicy?: Entities.LeavePolicy;
    public hrBpEmployee?: Entities.Employee;

    public positionAssignments = new Collection<Entities.PositionAssignment>(this);
    public assignedApprovalSteps = new Collection<Entities.HRApprovalStep>(this);
    public approvalDecisions = new Collection<Entities.HRApprovalDecision>(this);
    public leaveLedgerEntries = new Collection<Entities.LeaveLedgerEntry>(this);
    public initiatedHRRequests = new Collection<Entities.HRRequest>(this);
    public employmentHistory = new Collection<Entities.Employment>(this);
    public employeesAsHRBP = new Collection<Entities.Employee>(this);
    public hrRequests = new Collection<Entities.HRRequest>(this);
    public absences = new Collection<Entities.Absence>(this);

    public constructor(props: Entities.Employee.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.status = props.status ?? EmployeeStatus.DRAFT;
        this.termsRevision = props.termsRevision ?? 1;

        this.employmentStartedOn = props.employmentStartedOn;
        this.scheduleAnchorDate = props.scheduleAnchorDate;
        this.employmentEndedOn = props.employmentEndedOn;
        this.scheduleTimezone = props.scheduleTimezone;
        this.employeeNumber = props.employeeNumber;
        this.contractEndsOn = props.contractEndsOn;
        this.termsValidFrom = props.termsValidFrom;
        this.contractType = props.contractType;
        this.middleName = props.middleName;
        this.workEmail = props.workEmail;
        this.firstName = props.firstName;
        this.lastName = props.lastName;
        this.account = props.account;

        this.organization = props.organization;
        this.hrBpEmployee = props.hrBpEmployee;
        this.workCalendar = props.workCalendar;
        this.workSchedule = props.workSchedule;
        this.leavePolicy = props.leavePolicy;
    }

    public update({ patch }: Entities.Employee.ChangeDataProps): void {
        if (this.status === EmployeeStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.CANNOT_UPDATE_ARCHIVED` });
        } else {
            const now = new Date();
            let affected = 0;
            for (const [key, value] of Object.typedEntries(patch)) {
                if (typeof value !== "undefined" && value !== this[key]) {
                    (this[key] as unknown) = value;
                    ++affected;
                }
            }

            if (affected) {
                this.updatedAt = now;
            } else if (Object.keys(patch).length) {
                throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.NO_CHANGES_DETECTED` });
            } else {
                throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.EMPTY_UPDATE_PATCH` });
            }
        }
    }

    public linkAccount({ account }: Entities.Employee.LinkAccount.Props): void {
        if (this.status === EmployeeStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.CANNOT_UPDATE_ARCHIVED` });
        } else if (this.account) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.ACCOUNT_ALREADY_LINKED` });
        } else {
            this.account = account;
            this.updatedAt = new Date();
        }
    }

    public unlinkAccount(): void {
        if (this.status === EmployeeStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.CANNOT_UPDATE_ARCHIVED` });
        } else if (this.account) {
            this.account = undefined;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.ACCOUNT_NOT_LINKED` });
        }
    }

    public setHRBP({ employee }: Entities.Employee.SetHRBP.Props): void {
        if (this.status === EmployeeStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.CANNOT_UPDATE_ARCHIVED` });
        } else if (employee?.id === this.hrBpEmployee?.id) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.NO_CHANGES_DETECTED` });
        } else if (this.isInvalidHRBP(employee)) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_HRBP` });
        } else {
            this.hrBpEmployee = employee;
            this.updatedAt = new Date();
        }
    }

    public hire(props: Entities.Employee.Hire.Props): void {
        if (![EmployeeStatus.DRAFT, EmployeeStatus.TERMINATED].includes(this.status)) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_STATUS` });
        } else if (this.employmentEndedOn && props.employmentStartedOn <= this.employmentEndedOn) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_PERIOD` });
        } else if (this.hasTermsOrganizationMismatch(props)) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.hasArchivedTerms(props)) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.ARCHIVED_TERMS` });
        } else {
            if (this.status === EmployeeStatus.TERMINATED) {
                ++this.termsRevision;
            }
            this.status = EmployeeStatus.ACTIVE;
            this.employmentStartedOn = props.employmentStartedOn;
            this.employmentEndedOn = undefined;
            this.termsValidFrom = props.termsValidFrom;

            this.contractType = props.contractType;
            this.contractEndsOn = props.contractEndsOn;

            this.scheduleAnchorDate = props.scheduleAnchorDate;
            this.scheduleTimezone = props.scheduleTimezone;

            this.workCalendar = props.workCalendar;
            this.workSchedule = props.workSchedule;
            this.leavePolicy = props.leavePolicy;
            this.updatedAt = new Date();
        }
    }

    public changeTerms(props: Entities.Employee.ChangeTerms.Props): void {
        if (this.status !== EmployeeStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_STATUS` });
        } else if (props.termsValidFrom < this.termsValidFrom!) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_PERIOD` });
        } else if (this.hasTermsOrganizationMismatch(props)) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.hasArchivedTerms(props)) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.ARCHIVED_TERMS` });
        } else {
            this.contractType = props.contractType;
            this.contractEndsOn = props.contractEndsOn;

            this.scheduleAnchorDate = props.scheduleAnchorDate;
            this.scheduleTimezone = props.scheduleTimezone;

            this.workCalendar = props.workCalendar;
            this.workSchedule = props.workSchedule;
            this.leavePolicy = props.leavePolicy;

            this.termsValidFrom = props.termsValidFrom;
            ++this.termsRevision;
            this.updatedAt = new Date();
        }
    }

    public terminate({ employmentEndedOn }: Entities.Employee.Terminate.Props): void {
        if (this.status !== EmployeeStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_STATUS` });
        } else if (employmentEndedOn < this.employmentStartedOn! || employmentEndedOn < this.termsValidFrom!) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_PERIOD` });
        } else {
            this.employmentEndedOn = employmentEndedOn;
            this.status = EmployeeStatus.TERMINATED;
            ++this.termsRevision;
            this.termsValidFrom = employmentEndedOn;
            this.updatedAt = new Date();
        }
    }

    public archive(): void {
        if ([EmployeeStatus.DRAFT, EmployeeStatus.TERMINATED].includes(this.status)) {
            this.status = EmployeeStatus.ARCHIVED;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_STATUS` });
        }
    }

    public restore(): void {
        if (this.status === EmployeeStatus.ARCHIVED) {
            this.status = this.employmentEndedOn ? EmployeeStatus.TERMINATED : EmployeeStatus.DRAFT;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_STATUS` });
        }
    }

    public canCreate(): void {
        if (this.hasOrganizationMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.isInvalidHRBP(this.hrBpEmployee)) {
            throw Exception.invariantViolation({ messageKey: `${Employee.dictionaryPath}.INVALID_HRBP` });
        }
    }

    private isInvalidHRBP(employee?: Entities.Employee): boolean {
        return (
            !!employee &&
            (employee.organization.id !== this.organization.id ||
                employee.id === this.id ||
                employee.status !== EmployeeStatus.ACTIVE)
        );
    }

    private hasTermsOrganizationMismatch(props: Entities.Employee.ChangeTerms.Props): boolean {
        return [props.workCalendar, props.workSchedule, props.leavePolicy].some(
            (record) => record.organization.id !== this.organization.id,
        );
    }

    private hasArchivedTerms(props: Entities.Employee.ChangeTerms.Props): boolean {
        return [props.workCalendar, props.workSchedule, props.leavePolicy].some(
            (record) => record.status !== RecordStatus.ACTIVE,
        );
    }

    private hasOrganizationMismatch(): boolean {
        return [this.workCalendar, this.workSchedule, this.leavePolicy].some(
            (record) => record && record.organization.id !== this.organization.id,
        );
    }
}
