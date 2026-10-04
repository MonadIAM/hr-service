import { Collection } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { RecordStatus, PayPeriod } from "~context/enums";
import { Exception } from "~common/exceptions";

export class Position implements Entities.Position.Contract {
    private static readonly dictionaryPath = "entities.position";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public budgetPeriod?: PayPeriod;
    public budgetCurrency?: string;
    public budgetAmount?: string;
    public requirements?: string;
    public description?: string;
    public status: RecordStatus;
    public department: string;
    public plannedFte: string;
    public grade?: string;
    public title: string;
    public team?: string;
    public code: string;

    public organization: Entities.Organization;

    public positionAssignments = new Collection<Entities.PositionAssignment>(this);
    public targetedHRRequests = new Collection<Entities.HRRequest>(this);

    public constructor(props: Entities.Position.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.status = props.status ?? RecordStatus.ACTIVE;
        this.plannedFte = props.plannedFte ?? "1";

        this.budgetCurrency = props.budgetCurrency;
        this.budgetAmount = props.budgetAmount;
        this.budgetPeriod = props.budgetPeriod;
        this.requirements = props.requirements;
        this.description = props.description;
        this.department = props.department;
        this.title = props.title;
        this.grade = props.grade;
        this.code = props.code;
        this.team = props.team;

        this.organization = props.organization;
    }

    public update({ patch }: Entities.Position.ChangeDataProps): void {
        if (this.status === RecordStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${Position.dictionaryPath}.CANNOT_UPDATE_ARCHIVED` });
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
                throw Exception.invariantViolation({ messageKey: `${Position.dictionaryPath}.NO_CHANGES_DETECTED` });
            } else {
                throw Exception.invariantViolation({ messageKey: `${Position.dictionaryPath}.EMPTY_UPDATE_PATCH` });
            }
        }
    }

    public archive(): void {
        if (this.status === RecordStatus.ARCHIVED) {
            throw Exception.invariantViolation({ messageKey: `${Position.dictionaryPath}.ALREADY_ARCHIVED` });
        } else {
            this.status = RecordStatus.ARCHIVED;
            this.updatedAt = new Date();
        }
    }

    public restore(): void {
        if (this.status === RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${Position.dictionaryPath}.ALREADY_ACTIVE` });
        } else {
            this.status = RecordStatus.ACTIVE;
            this.updatedAt = new Date();
        }
    }

    public canPurge(): void {
        if (this.status === RecordStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${Position.dictionaryPath}.CANNOT_PURGE_ACTIVE` });
        }
    }
}
