import { EntitySchema } from "@mikro-orm/core";

import { WorkCalendarException, WorkCalendar, Organization } from "~context/domain/entities";
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

    indexes: [
        {
            name: "work_calendar_exception_organization_idx",
            properties: ["organization"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

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

        organization: {
            kind: "m:1",
            entity: () => Organization,
            fieldName: "organization_id",
            deleteRule: "cascade",
        },
        calendar: {
            kind: "m:1",
            entity: () => WorkCalendar,
            joinColumns: ["calendar_id", "organization_id"],
            columnTypes: ["uuid", "uuid"],
            referencedColumnNames: ["id", "organization_id"],
            ownColumns: ["calendar_id"],
            deleteRule: "no action",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
