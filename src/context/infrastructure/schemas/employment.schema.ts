import { EntitySchema } from "@mikro-orm/core";

import {
    WorkCalendar,
    WorkSchedule,
    Organization,
    LeavePolicy,
    Employment,
    HRRequest,
    Employee,
} from "~context/domain/entities";

export const EmploymentSchema = new EntitySchema<Employment>({
    class: Employment,
    tableName: "employment",
    schema: "hr",

    uniques: [
        {
            name: "employment_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "employment_employee_terms_revision_unique",
            properties: ["employee", "termsRevision"],
        },
    ],

    indexes: [
        {
            name: "employment_organization_idx",
            properties: ["organization"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        termsSnapshot: { type: "json" },
        termsRevision: { type: "int" },
        validFrom: { type: "date" },
        validTo: { type: "date" },

        organization: {
            kind: "m:1",
            entity: () => Organization,
            fieldName: "organization_id",
            deleteRule: "cascade",
        },
        employee: {
            kind: "m:1",
            entity: () => Employee,
            joinColumns: ["employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["employee_id"],
            deleteRule: "no action",
        },
        workCalendar: {
            kind: "m:1",
            entity: () => WorkCalendar,
            joinColumns: ["work_calendar_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["work_calendar_id"],
            deleteRule: "no action",
            nullable: true,
        },
        workSchedule: {
            kind: "m:1",
            entity: () => WorkSchedule,
            joinColumns: ["work_schedule_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["work_schedule_id"],
            deleteRule: "no action",
            nullable: true,
        },
        leavePolicy: {
            kind: "m:1",
            entity: () => LeavePolicy,
            joinColumns: ["leave_policy_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["leave_policy_id"],
            deleteRule: "no action",
            nullable: true,
        },
        replacedByRequest: {
            kind: "m:1",
            entity: () => HRRequest,
            joinColumns: ["replaced_by_request_id", "employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid", "uuid"],
            referencedColumnNames: ["id", "employee_id", "organization_id"],
            ownColumns: ["replaced_by_request_id"],
            deleteRule: "no action",
            nullable: true,
        },

        createdAt: { type: "timestamptz", length: 3 },
    },
});
