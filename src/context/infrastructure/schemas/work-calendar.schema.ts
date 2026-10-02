import { EntitySchema } from "@mikro-orm/core";

import { WorkCalendarException, WorkCalendar, Employment, Employee } from "~context/domain/entities";
import { RecordStatus } from "~context/enums";

export const WorkCalendarSchema = new EntitySchema<WorkCalendar>({
    class: WorkCalendar,
    tableName: "work_calendar",
    schema: "hr",

    uniques: [
        {
            name: "work_calendar_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "work_calendar_organization_code_unique",
            properties: ["organization", "code"],
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

        verifiedThrough: { type: "date", nullable: true },
        regionCode: { type: "text", nullable: true },
        countryCode: { type: "string", length: 2 },
        holidays: { type: "json" },
        code: { type: "text" },
        name: { type: "text" },

        employees: {
            kind: "1:m",
            entity: () => Employee,
            mappedBy: "workCalendar",
        },
        employmentHistory: {
            kind: "1:m",
            entity: () => Employment,
            mappedBy: "workCalendar",
        },
        exceptions: {
            kind: "1:m",
            entity: () => WorkCalendarException,
            mappedBy: "calendar",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
