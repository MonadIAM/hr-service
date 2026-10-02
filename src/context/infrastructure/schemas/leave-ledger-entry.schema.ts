import { DecimalType, EntitySchema } from "@mikro-orm/core";

import { LeaveLedgerEntry, LeavePolicy, HRRequest, Employee, Absence } from "~context/domain/entities";
import { LeaveLedgerKind, LeaveUnit } from "~context/enums";

export const LeaveLedgerEntrySchema = new EntitySchema<LeaveLedgerEntry>({
    class: LeaveLedgerEntry,
    tableName: "leave_ledger_entry",
    schema: "hr",

    uniques: [
        {
            name: "leave_ledger_entry_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "leave_ledger_entry_organization_idempotency_key_unique",
            properties: ["organization", "idempotencyKey"],
        },
        {
            name: "leave_ledger_entry_id_employee_pool_unit_organization_unique",
            properties: ["id", "employee", "poolCode", "unit", "organization"],
        },
        {
            name: "leave_ledger_entry_reverses_entry_unique",
            properties: ["reversesEntry"],
        },
    ],

    indexes: [
        {
            name: "leave_ledger_entry_employee_pool_unit_effective_on_idx",
            properties: ["organization", "employee", "poolCode", "unit", "effectiveOn"],
        },
        {
            name: "leave_ledger_entry_source_request_idx",
            properties: ["sourceRequest"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        organization: { type: "uuid", fieldName: "organization_id" },

        kind: { enum: true, items: () => LeaveLedgerKind, nativeEnumName: "ledger_kind" },
        unit: { enum: true, items: () => LeaveUnit, nativeEnumName: "leave_unit" },

        reservedDelta: { type: new DecimalType("string"), precision: 14, scale: 6 },
        balanceDelta: { type: new DecimalType("string"), precision: 14, scale: 6 },
        entitlementPeriodStart: { type: "date", nullable: true },
        entitlementPeriodEnd: { type: "date", nullable: true },
        calculationSnapshot: { type: "json" },
        idempotencyKey: { type: "text" },
        effectiveOn: { type: "date" },
        poolCode: { type: "text" },
        reason: { type: "text" },

        employee: {
            kind: "m:1",
            entity: () => Employee,
            joinColumns: ["employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["employee_id"],
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
        sourceRequest: {
            kind: "m:1",
            entity: () => HRRequest,
            joinColumns: ["source_request_id", "employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid", "uuid"],
            referencedColumnNames: ["id", "employee_id", "organization_id"],
            ownColumns: ["source_request_id"],
            deleteRule: "restrict",
            nullable: true,
        },
        absence: {
            kind: "m:1",
            entity: () => Absence,
            joinColumns: ["absence_id", "employee_id", "pool_code", "unit", "organization_id"],
            columnTypes: ["uuid", "uuid", "text", "hr.leave_unit", "uuid"],
            referencedColumnNames: ["id", "employee_id", "pool_code", "unit", "organization_id"],
            ownColumns: ["absence_id"],
            deleteRule: "restrict",
            nullable: true,
        },
        reversesEntry: {
            kind: "1:1",
            owner: true,
            unique: false,
            entity: () => LeaveLedgerEntry,
            joinColumns: ["reverses_entry_id", "employee_id", "pool_code", "unit", "organization_id"],
            columnTypes: ["uuid", "uuid", "text", "hr.leave_unit", "uuid"],
            referencedColumnNames: ["id", "employee_id", "pool_code", "unit", "organization_id"],
            ownColumns: ["reverses_entry_id"],
            deleteRule: "restrict",
            nullable: true,
        },

        reversedByEntry: {
            kind: "1:1",
            entity: () => LeaveLedgerEntry,
            mappedBy: "reversesEntry",
            nullable: true,
        },

        createdAt: { type: "timestamptz", length: 3 },
    },
});
