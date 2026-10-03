import { EntitySchema } from "@mikro-orm/core";

import { EmployeeStatus } from "~context/enums";
import {
    PositionAssignment,
    HRApprovalDecision,
    LeaveLedgerEntry,
    HRApprovalStep,
    WorkCalendar,
    WorkSchedule,
    LeavePolicy,
    Employment,
    HRRequest,
    Employee,
    Absence,
} from "~context/domain/entities";

export const EmployeeSchema = new EntitySchema<Employee>({
    class: Employee,
    tableName: "employee",
    schema: "hr",

    uniques: [
        {
            name: "employee_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "employee_organization_employee_number_unique",
            properties: ["organization", "employeeNumber"],
        },
        {
            name: "employee_organization_account_unique",
            properties: ["organization", "account"],
        },
    ],

    indexes: [
        {
            name: "employee_full_name_trgm_idx",
            expression:
                "CREATE INDEX \"employee_full_name_trgm_idx\" ON \"hr\".\"employee\" USING gin ((last_name || ' ' || first_name || coalesce(' ' || middle_name, '')) gin_trgm_ops)",
        },
        {
            name: "employee_employee_number_trgm_idx",
            expression:
                'CREATE INDEX "employee_employee_number_trgm_idx" ON "hr"."employee" USING gin (employee_number gin_trgm_ops)',
        },
        {
            name: "employee_hr_bp_employee_organization_idx",
            properties: ["hrBpEmployee", "organization"],
        },
        {
            name: "employee_organization_status_idx",
            properties: ["organization", "status"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        account: { type: "uuid", fieldName: "account_id", nullable: true },
        organization: { type: "uuid", fieldName: "organization_id" },

        status: {
            enum: true,
            items: () => EmployeeStatus,
            nativeEnumName: "employee_status",
            default: EmployeeStatus.DRAFT,
        },

        employmentStartedOn: { type: "date", nullable: true },
        scheduleAnchorDate: { type: "date", nullable: true },
        employmentEndedOn: { type: "date", nullable: true },
        scheduleTimezone: { type: "text", nullable: true },
        contractEndsOn: { type: "date", nullable: true },
        termsValidFrom: { type: "date", nullable: true },
        contractType: { type: "text", nullable: true },
        middleName: { type: "text", nullable: true },
        workEmail: { type: "text", nullable: true },
        employeeNumber: { type: "text" },
        termsRevision: { type: "int" },
        firstName: { type: "text" },
        lastName: { type: "text" },

        workCalendar: {
            kind: "m:1",
            entity: () => WorkCalendar,
            joinColumns: ["work_calendar_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["work_calendar_id"],
            deleteRule: "restrict",
            nullable: true,
        },
        workSchedule: {
            kind: "m:1",
            entity: () => WorkSchedule,
            joinColumns: ["work_schedule_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["work_schedule_id"],
            deleteRule: "restrict",
            nullable: true,
        },
        leavePolicy: {
            kind: "m:1",
            entity: () => LeavePolicy,
            joinColumns: ["leave_policy_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["leave_policy_id"],
            deleteRule: "restrict",
            nullable: true,
        },
        hrBpEmployee: {
            kind: "m:1",
            entity: () => Employee,
            joinColumns: ["hr_bp_employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["hr_bp_employee_id"],
            deleteRule: "restrict",
            nullable: true,
        },

        employeesAsHRBP: {
            kind: "1:m",
            entity: () => Employee,
            mappedBy: "hrBpEmployee",
        },
        positionAssignments: {
            kind: "1:m",
            entity: () => PositionAssignment,
            mappedBy: "employee",
        },
        employmentHistory: {
            kind: "1:m",
            entity: () => Employment,
            mappedBy: "employee",
        },
        hrRequests: {
            kind: "1:m",
            entity: () => HRRequest,
            mappedBy: "employee",
        },
        initiatedHRRequests: {
            kind: "1:m",
            entity: () => HRRequest,
            mappedBy: "initiatorEmployee",
        },
        assignedApprovalSteps: {
            kind: "1:m",
            entity: () => HRApprovalStep,
            mappedBy: "assigneeEmployee",
        },
        approvalDecisions: {
            kind: "1:m",
            entity: () => HRApprovalDecision,
            mappedBy: "actorEmployee",
        },
        absences: {
            kind: "1:m",
            entity: () => Absence,
            mappedBy: "employee",
        },
        leaveLedgerEntries: {
            kind: "1:m",
            entity: () => LeaveLedgerEntry,
            mappedBy: "employee",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
