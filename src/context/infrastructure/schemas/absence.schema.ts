import { DecimalType, EntitySchema } from "@mikro-orm/core";

import { LeaveLedgerEntry, LeavePolicy, HRRequest, Employee, Absence } from "~context/domain/entities";
import { AbsenceStatus, LeaveUnit } from "~context/enums";

export const AbsenceSchema = new EntitySchema<Absence>({
    class: Absence,
    tableName: "absence",
    schema: "hr",

    uniques: [
        {
            name: "absence_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "absence_source_request_source_item_key_unique",
            properties: ["sourceRequest", "sourceItemKey"],
        },
        {
            name: "absence_employee_pool_code_unit_organization_unique",
            properties: ["id", "employee", "poolCode", "unit", "organization"],
        },
    ],

    indexes: [
        {
            name: "absence_organization_employee_start_date_idx",
            properties: ["organization", "employee", "startDate"],
        },
        {
            name: "absence_organization_employee_starts_at_idx",
            properties: ["organization", "employee", "startsAt"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        organization: { type: "uuid", fieldName: "organization_id" },

        unit: { enum: true, items: () => LeaveUnit, nativeEnumName: "leave_unit" },
        status: {
            enum: true,
            items: () => AbsenceStatus,
            nativeEnumName: "absence_status",
            default: AbsenceStatus.SCHEDULED,
        },

        quantity: { type: new DecimalType("string"), precision: 14, scale: 6 },
        startDate: { type: "date", nullable: true },
        endDate: { type: "date", nullable: true },
        calculationSnapshot: { type: "json" },
        sourceItemKey: { type: "text" },
        poolCode: { type: "text" },
        timezone: { type: "text" },

        employee: {
            kind: "m:1",
            entity: () => Employee,
            joinColumns: ["employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["employee_id"],
            deleteRule: "restrict",
        },
        sourceRequest: {
            kind: "m:1",
            entity: () => HRRequest,
            joinColumns: ["source_request_id", "employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid", "uuid"],
            referencedColumnNames: ["id", "employee_id", "organization_id"],
            ownColumns: ["source_request_id"],
            deleteRule: "restrict",
        },
        leavePolicy: {
            kind: "m:1",
            entity: () => LeavePolicy,
            joinColumns: ["leave_policy_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["leave_policy_id"],
            deleteRule: "restrict",
        },
        cancelledByRequest: {
            kind: "m:1",
            entity: () => HRRequest,
            joinColumns: ["cancelled_by_request_id", "employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid", "uuid"],
            referencedColumnNames: ["id", "employee_id", "organization_id"],
            ownColumns: ["cancelled_by_request_id"],
            deleteRule: "restrict",
            nullable: true,
        },

        leaveLedgerEntries: {
            kind: "1:m",
            entity: () => LeaveLedgerEntry,
            mappedBy: "absence",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        startsAt: { type: "timestamptz", length: 3, nullable: true },
        endsAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
