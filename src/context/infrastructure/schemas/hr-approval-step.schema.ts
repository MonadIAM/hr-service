import { EntitySchema } from "@mikro-orm/core";

import { HRApprovalDecision, HRApprovalStep, Organization, HRRequest, Employee } from "~context/domain/entities";
import { HRApprovalStatus } from "~context/enums";

export const HRApprovalStepSchema = new EntitySchema<HRApprovalStep>({
    class: HRApprovalStep,
    tableName: "hr_approval_step",
    schema: "hr",

    uniques: [
        {
            name: "hr_approval_step_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "hr_approval_step_request_request_revision_ordinal_unique",
            properties: ["request", "requestRevision", "ordinal"],
        },
        {
            name: "hr_approval_step_id_request_revision_organization_unique",
            properties: ["id", "request", "requestRevision", "organization"],
        },
    ],

    indexes: [
        {
            name: "hr_approval_step_organization_assignee_employee_status_idx",
            properties: ["organization", "assigneeEmployee", "status"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        status: {
            enum: true,
            items: () => HRApprovalStatus,
            nativeEnumName: "approval_status",
            default: HRApprovalStatus.WAITING,
        },

        requestRevision: { type: "int" },
        ordinal: { type: "int" },
        name: { type: "text" },

        organization: {
            kind: "m:1",
            entity: () => Organization,
            fieldName: "organization_id",
            deleteRule: "cascade",
        },
        request: {
            kind: "m:1",
            entity: () => HRRequest,
            joinColumns: ["request_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["request_id"],
            deleteRule: "no action",
        },
        assigneeEmployee: {
            kind: "m:1",
            entity: () => Employee,
            joinColumns: ["assignee_employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["assignee_employee_id"],
            deleteRule: "no action",
        },

        decision: {
            kind: "1:1",
            entity: () => HRApprovalDecision,
            mappedBy: "step",
            nullable: true,
        },

        resolvedAt: { type: "timestamptz", length: 3, nullable: true },
        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        dueAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
