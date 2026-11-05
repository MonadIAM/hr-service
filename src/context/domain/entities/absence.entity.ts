import { Collection } from "@mikro-orm/core";
import { DateTime, Interval } from "luxon";
import { randomUUID } from "node:crypto";

import { Exception } from "~common/exceptions";
import {
    CalendarApplication,
    LeaveDayCounting,
    HRRequestStatus,
    SchedulePattern,
    HRRequestType,
    AbsenceStatus,
    DayOverride,
    LeaveUnit,
} from "~context/enums";

export class Absence implements Entities.Absence.Contract {
    private static readonly dictionaryPath = "entities.absence";
    private static readonly quantityScale = 6;

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

    public calculate(props: Entities.Absence.Calculate.Props): void {
        const { workCalendar, workSchedule, scheduleAnchorDate } = this.employee;
        const rule = this.leavePolicy.rules.find(({ poolCode, unit }) => poolCode === this.poolCode && unit === this.unit)!;
        const start =
            this.unit === LeaveUnit.DAY
                ? DateTime.fromISO(this.startDate!, { zone: "UTC" })
                : DateTime.fromJSDate(this.startsAt!, { zone: this.timezone });
        const end =
            this.unit === LeaveUnit.DAY
                ? DateTime.fromISO(this.endDate!, { zone: "UTC" })
                : DateTime.fromJSDate(this.endsAt!, { zone: this.timezone });
        const startDate = start.toISODate()!;
        const lastDate = end.minus({ milliseconds: 1 }).toISODate()!;

        this.canCalculate({ startDate, lastDate, rule });
        const quantity =
            this.unit === LeaveUnit.DAY
                ? this.calculateDays({ exceptions: props.exceptions, rule })
                : this.calculateMinutes({ exceptions: props.exceptions, startDate, lastDate });

        if (quantity === 0) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.EMPTY_PERIOD` });
        } else {
            this.quantity = quantity.toFixed(Absence.quantityScale);
            this.calculationSnapshot = {
                calendarApplication: workSchedule?.calendarApplication,
                termsRevision: this.employee.termsRevision,
                policyRevision: this.leavePolicy.revision,
                scheduleRevision: workSchedule?.revision,
                calendarVersion: workCalendar?.version,
                startsAt: this.startsAt?.toISOString(),
                endsAt: this.endsAt?.toISOString(),
                availability: rule.availability,
                endDateExclusive: this.endDate,
                workCalendar: workCalendar?.id,
                workSchedule: workSchedule?.id,
                dayCounting: rule.dayCounting,
                startDate: this.startDate,
                quantity: this.quantity,
                timezone: this.timezone,
                scheduleAnchorDate,
            };
        }
    }

    public period(): Entities.Absence.Period.Result {
        return this.unit === LeaveUnit.DAY
            ? [this.resolveLocalTime(this.startDate!).toJSDate(), this.resolveLocalTime(this.endDate!).toJSDate()]
            : [this.startsAt!, this.endsAt!];
    }

    public advanceStatus({ at }: Entities.Absence.AdvanceStatus.Props): void {
        if ([AbsenceStatus.SCHEDULED, AbsenceStatus.IN_PROGRESS].includes(this.status)) {
            let started: boolean;
            let completed: boolean;
            if (this.unit === LeaveUnit.DAY) {
                const date = DateTime.fromJSDate(at, { zone: this.timezone }).toISODate()!;

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

    private canCalculate(props: Entities.Absence.CanCalculate.Props): void {
        const { startDate, lastDate, rule } = props;
        const { workCalendar, workSchedule, termsValidFrom } = this.employee;
        const scheduledMinutes = rule.dayCounting === LeaveDayCounting.SCHEDULED_MINUTES;
        const usesCalendar =
            rule.dayCounting === LeaveDayCounting.CALENDAR_EXCLUDING_PUBLIC_HOLIDAYS ||
            (scheduledMinutes && workSchedule!.calendarApplication === CalendarApplication.APPLY_OVERRIDES);

        if (termsValidFrom && startDate < termsValidFrom) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.TERMS_PERIOD_MISMATCH` });
        } else if (usesCalendar && (!workCalendar?.verifiedThrough || lastDate > workCalendar.verifiedThrough)) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.UNVERIFIED_CALENDAR` });
        } else if (scheduledMinutes !== (this.unit === LeaveUnit.MINUTE)) {
            throw Exception.invariantViolation({ messageKey: `${Absence.dictionaryPath}.INVALID_POOL` });
        }
    }

    private calculateDays(props: Entities.Absence.CalculateDays.Props): number {
        const start = DateTime.fromISO(this.startDate!, { zone: "UTC" });
        const end = DateTime.fromISO(this.endDate!, { zone: "UTC" });
        let days = 0;

        if (props.rule.dayCounting === LeaveDayCounting.CALENDAR_DAYS) {
            days = end.diff(start, "days").days;
        } else {
            const exceptions = new Map(props.exceptions.map((exception) => [exception.date, exception]));
            for (let day = start; day < end; day = day.plus({ days: 1 })) {
                const date = day.toISODate()!;
                if (!this.isPublicHoliday(day, exceptions.get(date))) {
                    days++;
                }
            }
        }
        return days;
    }

    private calculateMinutes(props: Entities.Absence.CalculateMinutes.Props): number {
        const { scheduleAnchorDate, workSchedule } = this.employee;
        const appliesOverrides = workSchedule!.calendarApplication === CalendarApplication.APPLY_OVERRIDES;
        const anchor =
            workSchedule!.patternType === SchedulePattern.CYCLIC
                ? DateTime.fromISO(scheduleAnchorDate!, { zone: "UTC" })
                : undefined;
        const exceptions = appliesOverrides
            ? new Map(props.exceptions.map((exception) => [exception.date, exception]))
            : undefined;
        const absence = Interval.fromDateTimes(this.startsAt!, this.endsAt!);
        const firstDay = DateTime.fromISO(props.startDate, { zone: "UTC" }).minus({ days: 1 });
        const lastDay = DateTime.fromISO(props.lastDate, { zone: "UTC" });
        let minutes = 0;

        for (let day = firstDay; day <= lastDay; day = day.plus({ days: 1 })) {
            const date = day.toISODate()!;
            const exception = exceptions?.get(date);
            const intervals = this.workIntervals({ exception, anchor, day });
            let shortened = exception?.shortenedByMinutes ?? 0;

            for (let index = intervals.length - 1; index >= 0; index--) {
                const interval = intervals[index];
                const endDate = day.plus({ days: interval.endDayOffset }).toISODate()!;
                const start = this.resolveLocalTime(`${date}T${interval.start}`);
                const end = this.resolveLocalTime(`${endDate}T${interval.end}`);
                if (start < end) {
                    const reduction = Math.min(shortened, end.diff(start, "minutes").minutes);
                    const working = Interval.fromDateTimes(start, end.minus({ minutes: reduction }));
                    shortened -= reduction;
                    minutes += working.intersection(absence)?.length("minutes") ?? 0;
                }
            }
        }
        return minutes;
    }

    private workIntervals(props: Entities.Absence.WorkIntervals.Props): Entities.Absence.WorkIntervals.Result {
        const { exception, anchor, day } = props;
        const schedule = this.employee.workSchedule!;
        let intervals: Entities.WorkSchedule.Pattern.Interval[];

        if (schedule.patternType === SchedulePattern.WEEKLY) {
            const pattern = schedule.pattern as Entities.WorkSchedule.Pattern.Weekly;
            const weekday = day.weekday as Entities.WorkSchedule.Pattern.Weekday;
            intervals = pattern.week[weekday].intervals;
        } else {
            const { cycle } = schedule.pattern as Entities.WorkSchedule.Pattern.Cyclic;
            const offset = day.diff(anchor!, "days").days;
            const index = ((offset % cycle.length) + cycle.length) % cycle.length;
            intervals = cycle[index].intervals;
        }

        if (schedule.calendarApplication === CalendarApplication.APPLY_OVERRIDES) {
            if (exception?.workdayOverride === DayOverride.DAY_OFF) {
                intervals = [];
            } else if (exception?.workdayOverride === DayOverride.WORKDAY) {
                intervals = intervals.length ? intervals : (schedule.pattern.transferredWorkday?.intervals ?? []);
            } else if (intervals.length && this.isPublicHoliday(day, exception)) {
                intervals = [];
            }
        }
        return intervals;
    }

    private isPublicHoliday(day: DateTime, exception?: Entities.WorkCalendarException): boolean {
        const monthDay = day.toFormat("MM-dd");
        const date = day.toISODate()!;
        return (
            exception?.holidayOverride ??
            this.employee.workCalendar!.holidays.some(
                (holiday) =>
                    holiday.isPublicHoliday &&
                    date >= holiday.effectiveFrom &&
                    (!holiday.effectiveTo || date <= holiday.effectiveTo) &&
                    holiday.periods.some(({ from, through }) =>
                        from <= through ? monthDay >= from && monthDay <= through : monthDay >= from || monthDay <= through,
                    ),
            )
        );
    }

    private resolveLocalTime(value: string): DateTime {
        const local = DateTime.fromISO(value, { zone: this.timezone });
        return DateTime.min(...local.getPossibleOffsets())!;
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
