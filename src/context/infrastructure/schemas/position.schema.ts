import { DecimalType, EntitySchema } from "@mikro-orm/core";

import { PositionAssignment, Organization, HRRequest, Position } from "~context/domain/entities";
import { RecordStatus } from "~context/enums";

export const PositionSchema = new EntitySchema<Position>({
    class: Position,
    tableName: "position",
    schema: "hr",

    uniques: [
        {
            name: "position_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "position_organization_code_unique",
            properties: ["organization", "code"],
        },
    ],

    indexes: [
        {
            name: "position_title_trgm_idx",
            expression: 'CREATE INDEX "position_title_trgm_idx" ON "hr"."position" USING gin (title gin_trgm_ops)',
        },
        {
            name: "position_code_trgm_idx",
            expression: 'CREATE INDEX "position_code_trgm_idx" ON "hr"."position" USING gin (code gin_trgm_ops)',
        },
        {
            name: "position_organization_department_idx",
            properties: ["organization", "department"],
        },
        {
            name: "position_organization_team_idx",
            properties: ["organization", "team"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        department: { type: "uuid", fieldName: "department_id" },
        team: { type: "uuid", fieldName: "team_id" },
        process: { type: "uuid", nullable: true },

        status: {
            enum: true,
            items: () => RecordStatus,
            nativeEnumName: "record_status",
            default: RecordStatus.ACTIVE,
        },

        plannedFte: { type: new DecimalType("string"), precision: 5, scale: 4 },
        budgetAmount: {
            type: new DecimalType("string"),
            precision: 18,
            scale: 2,
            nullable: true,
        },

        budgetCurrency: { type: "string", length: 3, nullable: true },
        previousStatus: { type: "text", nullable: true },
        budgetPeriod: { type: "text", nullable: true },
        requirements: { type: "text", nullable: true },
        description: { type: "text", nullable: true },
        grade: { type: "text", nullable: true },
        title: { type: "text" },
        code: { type: "text" },

        organization: {
            kind: "m:1",
            entity: () => Organization,
            fieldName: "organization_id",
            deleteRule: "cascade",
        },
        positionAssignments: {
            kind: "1:m",
            entity: () => PositionAssignment,
            mappedBy: "position",
        },
        targetedHRRequests: {
            kind: "1:m",
            entity: () => HRRequest,
            mappedBy: "targetPosition",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
