import { EntitySchema } from "@mikro-orm/core";

import { WorkCalendarException, WorkCalendar } from "~context/domain/entities";
import { DayOverride } from "~context/enums";

export const WorkCalendarExceptionSchema = new EntitySchema<WorkCalendarException>({
    class: WorkCalendarException,
    tableName: "work_calendar_exception",
    schema: "hr",

    uniques: [
        {
            name: "work_calendar_exception_id_organization_unique",
            properties: ["id", "organization"],
        },
        {
            name: "work_calendar_exception_calendar_date_unique",
            properties: ["calendar", "date"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        organization: { type: "uuid", fieldName: "organization_id" },

        workdayOverride: {
            enum: true,
            items: () => DayOverride,
            nativeEnumName: "day_override",
            nullable: true,
        },

        shortenedByMinutes: { type: "smallint", nullable: true },
        holidayOverride: { type: "boolean", nullable: true },
        source: { type: "text", nullable: true },
        name: { type: "text", nullable: true },
        date: { type: "date" },

        calendar: {
            kind: "m:1",
            entity: () => WorkCalendar,
            joinColumns: ["calendar_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["calendar_id"],
            deleteRule: "restrict",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
