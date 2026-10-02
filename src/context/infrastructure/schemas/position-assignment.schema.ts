import { DecimalType, EntitySchema } from "@mikro-orm/core";

import { PositionAssignment, HRRequest, Employee, Position } from "~context/domain/entities";
import { PositionAssignmentStatus } from "~context/enums";

export const PositionAssignmentSchema = new EntitySchema<PositionAssignment>({
    class: PositionAssignment,
    tableName: "position_assignment",
    schema: "hr",

    uniques: [
        {
            name: "position_assignment_id_organization_unique",
            properties: ["id", "organization"],
        },
    ],

    indexes: [
        {
            name: "position_assignment_organization_employee_valid_from_idx",
            properties: ["organization", "employee", "validFrom"],
        },
        {
            name: "position_assignment_organization_position_valid_from_idx",
            properties: ["organization", "position", "validFrom"],
        },
        {
            name: "position_assignment_active_employee_unique",
            expression:
                'CREATE UNIQUE INDEX "position_assignment_active_employee_unique" ON "hr"."position_assignment" (employee_id) WHERE status = \'ACTIVE\'',
        },
        {
            name: "position_assignment_active_position_unique",
            expression:
                'CREATE UNIQUE INDEX "position_assignment_active_position_unique" ON "hr"."position_assignment" (position_id) WHERE status = \'ACTIVE\'',
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        team: { type: "uuid", fieldName: "team_id", nullable: true },
        organization: { type: "uuid", fieldName: "organization_id" },
        department: { type: "uuid", fieldName: "department_id" },

        status: {
            enum: true,
            items: () => PositionAssignmentStatus,
            nativeEnumName: "assignment_status",
            default: PositionAssignmentStatus.ACTIVE,
        },

        fte: { type: new DecimalType("string"), precision: 5, scale: 4 },
        salaryAmount: {
            type: new DecimalType("string"),
            precision: 18,
            scale: 2,
            nullable: true,
        },

        salaryCurrency: { type: "string", length: 3, nullable: true },
        salaryPeriod: { type: "text", nullable: true },
        validTo: { type: "date", nullable: true },
        grade: { type: "text", nullable: true },
        placementSnapshot: { type: "json" },
        positionTitle: { type: "text" },
        validFrom: { type: "date" },

        employee: {
            kind: "m:1",
            entity: () => Employee,
            joinColumns: ["employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["employee_id"],
            deleteRule: "restrict",
        },
        position: {
            kind: "m:1",
            entity: () => Position,
            joinColumns: ["position_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["position_id"],
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
        closedByRequest: {
            kind: "m:1",
            entity: () => HRRequest,
            joinColumns: ["closed_by_request_id", "employee_id", "organization_id"],
            columnTypes: ["uuid", "uuid", "uuid"],
            referencedColumnNames: ["id", "employee_id", "organization_id"],
            ownColumns: ["closed_by_request_id"],
            deleteRule: "restrict",
            nullable: true,
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
