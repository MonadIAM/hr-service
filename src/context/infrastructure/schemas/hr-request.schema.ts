import { EntitySchema } from "@mikro-orm/core";

import { HRExecutionStatus, HRRequestStatus, HRRequestType } from "~context/enums";
import {
    PositionAssignment,
    LeaveLedgerEntry,
    HRApprovalStep,
    Organization,
    Employment,
    HRRequest,
    Employee,
    Position,
    Absence,
} from "~context/domain/entities";

export const HRRequestSchema = new EntitySchema<HRRequest>({
    class: HRRequest,
    tableName: "hr_request",
    schema: "hr",

    uniques: [
        {
            name: "hr_request_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "hr_request_id_employee_organization_unique",
            properties: ["id", "employee", "organization"],
        },
        {
            name: "hr_request_organization_idempotency_key_unique",
            properties: ["organization", "idempotencyKey"],
        },
    ],

    indexes: [
        {
            name: "hr_request_organization_employee_created_at_idx",
            properties: ["organization", "employee", "createdAt"],
        },
        {
            name: "hr_request_organization_status_idx",
            properties: ["organization", "status"],
        },
        {
            name: "hr_request_execution_status_effective_at_idx",
            properties: ["executionStatus", "effectiveAt"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        initiatorAccount: { type: "uuid", fieldName: "initiator_account_id" },

        type: { enum: true, items: () => HRRequestType, nativeEnumName: "request_type" },
        executionStatus: {
            enum: true,
            items: () => HRExecutionStatus,
            nativeEnumName: "execution_status",
            default: HRExecutionStatus.NOT_STARTED,
        },
        status: {
            enum: true,
            items: () => HRRequestStatus,
            nativeEnumName: "request_status",
            default: HRRequestStatus.DRAFT,
        },

        approvedRevision: { type: "int", nullable: true },
        workflowVersion: { type: "int", nullable: true },
        appliedRevision: { type: "int", nullable: true },
        workflowCode: { type: "text", nullable: true },
        failure: { type: "text", nullable: true },
        result: { type: "json", nullable: true },
        payloadSchemaVersion: { type: "int" },
        idempotencyKey: { type: "text" },
        revision: { type: "int" },
        payload: { type: "json" },

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
        initiatorEmployee: {
            kind: "m:1",
            entity: () => Employee,
            joinColumns: ["initiator_employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["initiator_employee_id"],
            deleteRule: "no action",
            nullable: true,
        },
        targetPosition: {
            kind: "m:1",
            entity: () => Position,
            joinColumns: ["target_position_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["target_position_id"],
            deleteRule: "no action",
            nullable: true,
        },
        relatedRequest: {
            kind: "m:1",
            entity: () => HRRequest,
            joinColumns: ["related_request_id", "employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid", "uuid"],
            referencedColumnNames: ["id", "employee_id", "organization_id"],
            ownColumns: ["related_request_id"],
            deleteRule: "no action",
            nullable: true,
        },

        createdPositionAssignments: {
            kind: "1:m",
            entity: () => PositionAssignment,
            mappedBy: "sourceRequest",
        },
        closedPositionAssignments: {
            kind: "1:m",
            entity: () => PositionAssignment,
            mappedBy: "closedByRequest",
        },
        replacedEmploymentHistory: {
            kind: "1:m",
            entity: () => Employment,
            mappedBy: "replacedByRequest",
        },
        relatedRequests: {
            kind: "1:m",
            entity: () => HRRequest,
            mappedBy: "relatedRequest",
        },
        approvalSteps: {
            kind: "1:m",
            entity: () => HRApprovalStep,
            mappedBy: "request",
        },
        createdAbsences: {
            kind: "1:m",
            entity: () => Absence,
            mappedBy: "sourceRequest",
        },
        cancelledAbsences: {
            kind: "1:m",
            entity: () => Absence,
            mappedBy: "cancelledByRequest",
        },
        leaveLedgerEntries: {
            kind: "1:m",
            entity: () => LeaveLedgerEntry,
            mappedBy: "sourceRequest",
        },

        effectiveAt: { type: "timestamptz", length: 3, nullable: true },
        submittedAt: { type: "timestamptz", length: 3, nullable: true },
        approvedAt: { type: "timestamptz", length: 3, nullable: true },
        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        appliedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
