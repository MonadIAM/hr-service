import { Collection } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { AbsenceStatus, LeaveUnit, HRRequestType, HRRequestStatus } from "~context/enums";
import { Exception } from "~common/exceptions";

export class Absence implements Entities.Absence.Contract {
    private static readonly dictionaryPath = "entities.absence";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public calculationSnapshot: UnknownObject;
    public status: AbsenceStatus;
    public sourceItemKey: string;
    public startDate?: string;
    public poolCode: string;
    public quantity: string;
    public timezone: string;
    public endDate?: string;
    public unit: LeaveUnit;
    public startsAt?: Date;
    public endsAt?: Date;

    public cancelledByRequest?: Entities.HRRequest;
    public organization: Entities.Organization;
    public leavePolicy: Entities.LeavePolicy;
    public sourceRequest: Entities.HRRequest;
    public employee: Entities.Employee;

    public leaveLedgerEntries = new Collection<Entities.LeaveLedgerEntry>(this);

    public constructor(props: Entities.Absence.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.status = props.status ?? AbsenceStatus.SCHEDULED;
        this.sourceItemKey = props.sourceItemKey ?? "main";

        this.calculationSnapshot = props.calculationSnapshot;
        this.startDate = props.startDate;
        this.quantity = props.quantity;
        this.startsAt = props.startsAt;
        this.timezone = props.timezone;
        this.poolCode = props.poolCode;
        this.endDate = props.endDate;
        this.endsAt = props.endsAt;
        this.unit = props.unit;

        this.organization = props.organization;
        this.cancelledByRequest = props.cancelledByRequest;
        this.sourceRequest = props.sourceRequest;
        this.leavePolicy = props.leavePolicy;
        this.employee = props.employee;
    }

    public advanceStatus({ at }: Entities.Absence.AdvanceStatus.Props): void {
        if ([AbsenceStatus.SCHEDULED, AbsenceStatus.IN_PROGRESS].includes(this.status)) {
            let started: boolean;
            let completed: boolean;
            if (this.unit === LeaveUnit.DAY) {
                const parts = new Intl.DateTimeFormat("en", {
                    timeZone: this.timezone,
                    month: "2-digit",
                    year: "numeric",
                    day: "2-digit",
                }).formatToParts(at);

                const year = parts.find((part) => part.type === "year")!.value;
                const month = parts.find((part) => part.type === "month")!.value;
                const day = parts.find((part) => part.type === "day")!.value;
                const date = `${year}-${month}-${day}`;

                started = date >= this.startDate!;
                completed = date >= this.endDate!;
            } else {
                started = at >= this.startsAt!;
                completed = at >= this.endsAt!;
            }

            const status = completed
                ? AbsenceStatus.COMPLETED
                : started
                  ? AbsenceStatus.IN_PROGRESS
                  : AbsenceStatus.SCHEDULED;

            if (
                status === this.status ||
                (this.status === AbsenceStatus.IN_PROGRESS && status === AbsenceStatus.SCHEDULED)
            ) {
                throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.NO_CHANGES_DETECTED` });
            }
            this.status = status;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.INVALID_STATUS` });
        }
    }

    public cancel({ request }: Entities.Absence.Cancel.Props): void {
        if (this.status === AbsenceStatus.CANCELLED) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.INVALID_STATUS` });
        } else if (this.hasCancellationRequestMismatch(request)) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.REQUEST_MISMATCH` });
        } else if (request.status !== HRRequestStatus.APPROVED || request.approvedRevision !== request.revision) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.INVALID_REQUEST_STATUS` });
        } else {
            this.cancelledByRequest = request;
            this.status = AbsenceStatus.CANCELLED;
            this.updatedAt = new Date();
        }
    }

    public canCreate(): void {
        if (this.hasOrganizationMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.hasRequestEmployeeMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.REQUEST_MISMATCH` });
        } else if (!this.leavePolicy.rules.some((rule) => rule.poolCode === this.poolCode && rule.unit === this.unit)) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.INVALID_POOL` });
        }
    }

    private hasCancellationRequestMismatch(request: Entities.HRRequest): boolean {
        return (
            request.organization.id !== this.organization.id ||
            request.employee.id !== this.employee.id ||
            request.type !== HRRequestType.CANCEL_REQUEST ||
            request.relatedRequest?.id !== this.sourceRequest.id
        );
    }

    private hasOrganizationMismatch(): boolean {
        return [this.employee, this.leavePolicy, this.sourceRequest, this.cancelledByRequest].some(
            (record) => record && record.organization.id !== this.organization.id,
        );
    }

    private hasRequestEmployeeMismatch(): boolean {
        return (
            this.sourceRequest.employee.id !== this.employee.id ||
            (!!this.cancelledByRequest && this.cancelledByRequest.employee.id !== this.employee.id)
        );
    }
}
