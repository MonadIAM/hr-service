import { EntitySchema } from "@mikro-orm/core";

import { LeaveLedgerEntry, LeavePolicy, Employment, Employee, Absence } from "~context/domain/entities";
import { RecordStatus } from "~context/enums";

export const LeavePolicySchema = new EntitySchema<LeavePolicy>({
    class: LeavePolicy,
    tableName: "leave_policy",
    schema: "hr",

    uniques: [
        {
            name: "leave_policy_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "leave_policy_organization_code_revision_unique",
            properties: ["organization", "code", "revision"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        organization: { type: "uuid", fieldName: "organization_id" },

        status: {
            enum: true,
            items: () => RecordStatus,
            nativeEnumName: "record_status",
            default: RecordStatus.ACTIVE,
        },

        jurisdiction: { type: "text" },
        revision: { type: "int" },
        rules: { type: "json" },
        code: { type: "text" },
        name: { type: "text" },

        employees: {
            kind: "1:m",
            entity: () => Employee,
            mappedBy: "leavePolicy",
        },
        employmentHistory: {
            kind: "1:m",
            entity: () => Employment,
            mappedBy: "leavePolicy",
        },
        absences: {
            kind: "1:m",
            entity: () => Absence,
            mappedBy: "leavePolicy",
        },
        leaveLedgerEntries: {
            kind: "1:m",
            entity: () => LeaveLedgerEntry,
            mappedBy: "leavePolicy",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
