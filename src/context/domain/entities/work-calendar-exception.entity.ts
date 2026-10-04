import { randomUUID } from "node:crypto";

import { Exception } from "~common/exceptions";
import { DayOverride } from "~context/enums";

export class WorkCalendarException implements Entities.WorkCalendarException.Contract {
    private static readonly dictionaryPath = "entities.work-calendar-exception";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public workdayOverride?: DayOverride;
    public shortenedByMinutes?: number;
    public holidayOverride?: boolean;
    public source?: string;
    public name?: string;
    public date: string;

    public organization: Entities.Organization;
    public calendar: Entities.WorkCalendar;

    public constructor(props: Entities.WorkCalendarException.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.shortenedByMinutes = props.shortenedByMinutes;
        this.holidayOverride = props.holidayOverride;
        this.workdayOverride = props.workdayOverride;
        this.source = props.source;
        this.date = props.date;
        this.name = props.name;

        this.organization = props.organization;
        this.calendar = props.calendar;
    }

    public update({ patch }: Entities.WorkCalendarException.ChangeDataProps): void {
        const now = new Date();
        let affected = 0;
        for (const [key, value] of Object.typedEntries(patch)) {
            if (typeof value !== "undefined" && value !== this[key]) {
                (this[key] as unknown) = value;
                ++affected;
            }
        }

        if (affected) {
            this.updatedAt = now;
        } else if (Object.keys(patch).length) {
            throw Exception.invariantViolation({
                messageKey: `${WorkCalendarException.dictionaryPath}.NO_CHANGES_DETECTED`,
            });
        } else {
            throw Exception.invariantViolation({
                messageKey: `${WorkCalendarException.dictionaryPath}.EMPTY_UPDATE_PATCH`,
            });
        }
    }

    public canCreate(): void {
        if (this.calendar.organization.id !== this.organization.id) {
            throw Exception.invariantViolation({
                messageKey: `${WorkCalendarException.dictionaryPath}.ORGANIZATION_MISMATCH`,
            });
        }
    }
}
