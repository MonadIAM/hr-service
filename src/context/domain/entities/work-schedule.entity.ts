import { Collection } from "@mikro-orm/core";
import { isDeepStrictEqual } from "node:util";
import { randomUUID } from "node:crypto";

import { CalendarApplication, SchedulePattern, RecordStatus } from "~context/enums";
import { Exception } from "~common/exceptions";

export class WorkSchedule implements Entities.WorkSchedule.Contract {
    private static readonly dictionaryPath = "entities.work-schedule";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public calendarApplication: CalendarApplication;
    public pattern: Entities.WorkSchedule.Pattern;
    public patternType: SchedulePattern;
    public status: RecordStatus;
    public revision: number;
    public code: string;
    public name: string;

    public organization: Entities.Organization;

    public employmentHistory = new Collection<Entities.Employment>(this);
    public employees = new Collection<Entities.Employee>(this);

    public constructor(props: Entities.WorkSchedule.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.status = props.status ?? RecordStatus.ACTIVE;
        this.revision = props.revision ?? 1;

        this.calendarApplication = props.calendarApplication;
        this.patternType = props.patternType;
        this.pattern = props.pattern;
        this.code = props.code;
        this.name = props.name;

        this.organization = props.organization;
    }

    public archive(): void {
        if (this.status === RecordStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${WorkSchedule.dictionaryPath}.ALREADY_ARCHIVED` });
        } else {
            this.status = RecordStatus.ARCHIVED;
            this.updatedAt = new Date();
        }
    }

    public restore(): void {
        if (this.status === RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${WorkSchedule.dictionaryPath}.ALREADY_ACTIVE` });
        } else {
            this.status = RecordStatus.ACTIVE;
            this.updatedAt = new Date();
        }
    }

    public canPurge(): void {
        if (this.status === RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${WorkSchedule.dictionaryPath}.CANNOT_PURGE_ACTIVE` });
        }
    }

    public createRevision(props: Entities.WorkSchedule.CreateRevision.Props): Entities.WorkSchedule {
        if (this.status !== RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${WorkSchedule.dictionaryPath}.CANNOT_UPDATE_ARCHIVED` });
        } else if (Object.typedEntries(props).every(([key, value]) => !value || isDeepStrictEqual(value, this[key]))) {
            throw Exception.invariantViolation({ messageKey: `${WorkSchedule.dictionaryPath}.NO_CHANGES_DETECTED` });
        } else {
            return new WorkSchedule({
                calendarApplication: props.calendarApplication ?? this.calendarApplication,
                pattern: structuredClone(props.pattern ?? this.pattern),
                patternType: props.patternType ?? this.patternType,
                organization: this.organization,
                name: props.name ?? this.name,
                revision: this.revision + 1,
                code: this.code,
            });
        }
    }
}
