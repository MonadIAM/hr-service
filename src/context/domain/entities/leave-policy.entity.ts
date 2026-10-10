import { isDeepStrictEqual } from "node:util";
import { Collection } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { Exception } from "~common/exceptions";
import { RecordStatus } from "~context/enums";

export class LeavePolicy implements Entities.LeavePolicy.Contract {
    private static readonly dictionaryPath = "entities.leave-policy";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public code: string;
    public name: string;
    public revision: number;
    public status: RecordStatus;
    public jurisdiction: string;

    public organization: Entities.Organization;
    public rules: Entities.LeavePolicy.Rule[];

    public leaveLedgerEntries = new Collection<Entities.LeaveLedgerEntry>(this);
    public employmentHistory = new Collection<Entities.Employment>(this);
    public employees = new Collection<Entities.Employee>(this);
    public absences = new Collection<Entities.Absence>(this);

    public constructor(props: Entities.LeavePolicy.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.status = props.status ?? RecordStatus.ACTIVE;
        this.revision = props.revision ?? 1;

        this.jurisdiction = props.jurisdiction;
        this.code = props.code;
        this.name = props.name;

        this.rules = props.rules;

        this.organization = props.organization;
    }

    public archive(): void {
        if (this.status === RecordStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${LeavePolicy.dictionaryPath}.ALREADY_ARCHIVED` });
        } else {
            this.status = RecordStatus.ARCHIVED;
            this.updatedAt = new Date();
        }
    }

    public restore(): void {
        if (this.status === RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${LeavePolicy.dictionaryPath}.ALREADY_ACTIVE` });
        } else {
            this.status = RecordStatus.ACTIVE;
            this.updatedAt = new Date();
        }
    }

    public canPurge(): void {
        if (this.status === RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${LeavePolicy.dictionaryPath}.CANNOT_PURGE_ACTIVE` });
        }
    }

    public createRevision(props: Entities.LeavePolicy.CreateRevision.Props): Entities.LeavePolicy {
        if (this.status !== RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${LeavePolicy.dictionaryPath}.CANNOT_UPDATE_ARCHIVED` });
        } else if (Object.typedEntries(props).every(([key, value]) => !value || isDeepStrictEqual(value, this[key]))) {
            throw Exception.invariantViolation({ messageKey: `${LeavePolicy.dictionaryPath}.NO_CHANGES_DETECTED` });
        } else {
            return new LeavePolicy({
                jurisdiction: props.jurisdiction ?? this.jurisdiction,
                rules: structuredClone(props.rules ?? this.rules),
                organization: this.organization,
                name: props.name ?? this.name,
                revision: this.revision + 1,
                code: this.code,
            });
        }
    }
}
