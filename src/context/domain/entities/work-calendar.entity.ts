import { Collection } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { Exception } from "~common/exceptions";
import { RecordStatus } from "~context/enums";

export class WorkCalendar implements Entities.WorkCalendar.Contract {
    private static readonly dictionaryPath = "entities.work-calendar";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public holidays: Entities.WorkCalendar.Holiday[];
    public verifiedThrough?: string;
    public status: RecordStatus;
    public countryCode: string;
    public regionCode?: string;
    public code: string;
    public name: string;

    public organization: Entities.Organization;

    public exceptions = new Collection<Entities.WorkCalendarException>(this);
    public employmentHistory = new Collection<Entities.Employment>(this);
    public employees = new Collection<Entities.Employee>(this);

    public constructor(props: Entities.WorkCalendar.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.status = props.status ?? RecordStatus.ACTIVE;
        this.holidays = props.holidays ?? [];

        this.verifiedThrough = props.verifiedThrough;
        this.countryCode = props.countryCode;
        this.regionCode = props.regionCode;
        this.code = props.code;
        this.name = props.name;

        this.organization = props.organization;
    }

    public update({ patch }: Entities.WorkCalendar.ChangeDataProps): void {
        if (this.status === RecordStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${WorkCalendar.dictionaryPath}.CANNOT_UPDATE_ARCHIVED` });
        } else {
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
                throw Exception.invariantViolation({ messageKey: `${WorkCalendar.dictionaryPath}.NO_CHANGES_DETECTED` });
            } else {
                throw Exception.invariantViolation({ messageKey: `${WorkCalendar.dictionaryPath}.EMPTY_UPDATE_PATCH` });
            }
        }
    }

    public archive(): void {
        if (this.status === RecordStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${WorkCalendar.dictionaryPath}.ALREADY_ARCHIVED` });
        } else {
            this.status = RecordStatus.ARCHIVED;
            this.updatedAt = new Date();
        }
    }

    public restore(): void {
        if (this.status === RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${WorkCalendar.dictionaryPath}.ALREADY_ACTIVE` });
        } else {
            this.status = RecordStatus.ACTIVE;
            this.updatedAt = new Date();
        }
    }

    public canPurge(): void {
        if (this.status === RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${WorkCalendar.dictionaryPath}.CANNOT_PURGE_ACTIVE` });
        }
    }
}
