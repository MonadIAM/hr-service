import { EntitySchema } from "@mikro-orm/core";

import { HRApprovalDecision, HRApprovalStep, Organization, Employee } from "~context/domain/entities";
import { HRDecisionKind } from "~context/enums";

export const HRApprovalDecisionSchema = new EntitySchema<HRApprovalDecision>({
    class: HRApprovalDecision,
    tableName: "hr_approval_decision",
    schema: "hr",

    uniques: [
        {
            name: "hr_approval_decision_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "hr_approval_decision_step_unique",
            properties: ["step"],
        },
    ],

    indexes: [
        {
            name: "hr_approval_decision_organization_idx",
            properties: ["organization"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        actorAccount: { type: "uuid", fieldName: "actor_account_id" },
        request: { type: "uuid", fieldName: "request_id" },

        decision: { enum: true, items: () => HRDecisionKind, nativeEnumName: "decision_kind" },

        comment: { type: "text", nullable: true },
        requestRevision: { type: "int" },

        organization: {
            kind: "m:1",
            entity: () => Organization,
            fieldName: "organization_id",
            deleteRule: "cascade",
        },
        step: {
            kind: "1:1",
            owner: true,
            unique: false,
            entity: () => HRApprovalStep,
            joinColumns: ["step_id", "request_id", "request_revision", "organization_id"],
            columnTypes: ["uuid", "uuid", "integer", "uuid"],
            referencedColumnNames: ["id", "request_id", "request_revision", "organization_id"],
            ownColumns: ["step_id"],
            deleteRule: "no action",
        },
        actorEmployee: {
            kind: "m:1",
            entity: () => Employee,
            joinColumns: ["actor_employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["actor_employee_id"],
            deleteRule: "no action",
        },

        createdAt: { type: "timestamptz", length: 3 },
        decidedAt: { type: "timestamptz", length: 3 },
    },
});
