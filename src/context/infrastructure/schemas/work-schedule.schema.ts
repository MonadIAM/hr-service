import { EntitySchema } from "@mikro-orm/core";

import { CalendarApplication, SchedulePattern, RecordStatus } from "~context/enums";
import { WorkSchedule, Employment, Employee } from "~context/domain/entities";

export const WorkScheduleSchema = new EntitySchema<WorkSchedule>({
    class: WorkSchedule,
    tableName: "work_schedule",
    schema: "hr",

    uniques: [
        {
            name: "work_schedule_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "work_schedule_organization_code_revision_unique",
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

        revision: { type: "int" },
        code: { type: "text" },
        name: { type: "text" },

        patternType: {
            enum: true,
            items: () => SchedulePattern,
            nativeEnumName: "schedule_pattern",
        },
        pattern: { type: "json" },
        calendarApplication: {
            enum: true,
            items: () => CalendarApplication,
            nativeEnumName: "calendar_application",
        },

        employees: {
            kind: "1:m",
            entity: () => Employee,
            mappedBy: "workSchedule",
        },
        employmentHistory: {
            kind: "1:m",
            entity: () => Employment,
            mappedBy: "workSchedule",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
