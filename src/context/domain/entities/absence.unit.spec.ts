import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import {
    CalendarApplication,
    HRRequestStatus,
    SchedulePattern,
    HRRequestType,
    AbsenceStatus,
    DayOverride,
    LeaveUnit,
} from "~context/enums";

import { Absence } from "./absence.entity";

const organization = { id: "organization", realm: "realm" };

function stubEmployee(overrides?: Partial<Entities.Employee>): Entities.Employee {
    return { id: "employee", organization, ...overrides } as Entities.Employee;
}

function stubRequest(overrides?: Partial<Entities.HRRequest>): Entities.HRRequest {
    return { id: "request", organization, employee: stubEmployee(), ...overrides } as Entities.HRRequest;
}

function stubPolicy(): Entities.LeavePolicy {
    return { organization, rules: [{ poolCode: "annual", unit: LeaveUnit.DAY }] } as Entities.LeavePolicy;
}

function createAbsence(overrides?: Partial<Entities.Absence.ConstructorProps>): Absence {
    return new Absence({
        organization,
        employee: stubEmployee(),
        sourceRequest: stubRequest(),
        leavePolicy: stubPolicy(),
        status: AbsenceStatus.SCHEDULED,
        sourceItemKey: "main",
        calculationSnapshot: {},
        poolCode: "annual",
        quantity: "2",
        unit: LeaveUnit.DAY,
        timezone: "America/New_York",
        startDate: "2026-01-10",
        endDate: "2026-01-12",
        ...overrides,
    });
}

describe("[Entity] - Absence", () => {
    describe("[Method] - calculate", () => {
        function calculated(unit: LeaveUnit, dayCounting: Entities.LeavePolicy.Rule["dayCounting"]): Absence {
            const calendar = {
                id: "calendar",
                version: 1,
                holidays: [],
                verifiedThrough: "2031-12-31",
            } as unknown as Entities.WorkCalendar;
            const schedule = {
                id: "schedule",
                revision: 1,
                calendarApplication: CalendarApplication.APPLY_OVERRIDES,
                patternType: SchedulePattern.CYCLIC,
                pattern: { schemaVersion: 1, cycle: [{ intervals: [{ start: "09:00", end: "17:00", endDayOffset: 0 }] }] },
            } as Entities.WorkSchedule;
            return createAbsence({
                leavePolicy: {
                    ...stubPolicy(),
                    revision: 1,
                    rules: [{ poolCode: "annual", unit, dayCounting, availability: "BALANCE" }],
                } as Entities.LeavePolicy,
                employee: stubEmployee({
                    workCalendar: calendar,
                    workSchedule: schedule,
                    scheduleAnchorDate: "2026-01-01",
                    termsRevision: 1,
                }),
                timezone: "Europe/London",
                unit,
            });
        }

        it("[case] - counts calendar days across DST with an exclusive end", () => {
            // Arrange
            const absence = calculated(LeaveUnit.DAY, "CALENDAR_DAYS");
            absence.startDate = "2026-03-28";
            absence.endDate = "2026-03-31";

            // Act
            absence.calculate({ exceptions: [] });

            // Assert
            expect(absence.quantity).toBe("3.000000");
            expect(absence.period().map((date) => date.toISOString())).toEqual([
                "2026-03-28T00:00:00.000Z",
                "2026-03-30T23:00:00.000Z",
            ]);
        });

        it("[case] - excludes recurring public holidays and applies explicit holiday overrides", () => {
            // Arrange
            const absence = calculated(LeaveUnit.DAY, "CALENDAR_EXCLUDING_PUBLIC_HOLIDAYS");
            absence.startDate = "2026-12-31";
            absence.endDate = "2027-01-04";
            absence.employee.workCalendar!.holidays = [
                {
                    code: "HOLIDAY",
                    name: "Holiday",
                    isPublicHoliday: true,
                    effectiveFrom: "2026-01-01",
                    effectiveTo: null,
                    periods: [{ from: "12-31", through: "01-02" }],
                },
            ];
            const exceptions = [{ date: "2027-01-01", holidayOverride: false }] as Entities.WorkCalendarException[];

            // Act
            absence.calculate({ exceptions });

            // Assert
            expect(absence.quantity).toBe("2.000000");
        });

        it("[case] - intersects working intervals and removes shortened minutes", () => {
            // Arrange
            const absence = calculated(LeaveUnit.MINUTE, "SCHEDULED_MINUTES");
            absence.startsAt = new Date("2026-07-01T07:00:00Z");
            absence.endsAt = new Date("2026-07-01T17:00:00Z");
            const exceptions = [{ date: "2026-07-01", shortenedByMinutes: 60 }] as Entities.WorkCalendarException[];

            // Act
            absence.calculate({ exceptions });

            // Assert
            expect(absence.quantity).toBe("420.000000");
        });

        it("[case] - includes the previous day's overnight shift and DST elapsed minutes", () => {
            // Arrange
            const absence = calculated(LeaveUnit.MINUTE, "SCHEDULED_MINUTES");
            absence.employee.workSchedule!.pattern = {
                schemaVersion: 1,
                cycle: [{ intervals: [{ start: "22:00", end: "06:00", endDayOffset: 1 }] }],
            };
            absence.startsAt = new Date("2026-03-29T00:00:00Z");
            absence.endsAt = new Date("2026-03-29T05:00:00Z");

            // Act
            absence.calculate({ exceptions: [] });

            // Assert
            expect(absence.quantity).toBe("300.000000");
        });

        it.each([
            { date: "2026-10-25", start: "01:30", end: "02:30", quantity: "120.000000" },
            { date: "2026-03-29", start: "01:30", end: "03:30", quantity: "60.000000" },
        ])("[case] - resolves ambiguous or missing local shift boundaries on $date", ({ date, start, end, quantity }) => {
            // Arrange
            const absence = calculated(LeaveUnit.MINUTE, "SCHEDULED_MINUTES");
            absence.employee.workSchedule!.pattern = {
                schemaVersion: 1,
                cycle: [{ intervals: [{ start, end, endDayOffset: 0 }] }],
            };
            absence.startsAt = new Date(`${date}T00:00:00Z`);
            absence.endsAt = new Date(`${date}T05:00:00Z`);

            // Act
            absence.calculate({ exceptions: [] });

            // Assert
            expect(absence.quantity).toBe(quantity);
        });

        it("[case] - shortens the final intervals first without mutating the schedule", () => {
            // Arrange
            const absence = calculated(LeaveUnit.MINUTE, "SCHEDULED_MINUTES");
            const intervals: Entities.WorkSchedule.Pattern.Interval[] = [
                { start: "09:00", end: "12:00", endDayOffset: 0 },
                { start: "13:00", end: "17:00", endDayOffset: 0 },
            ];
            absence.employee.workSchedule!.pattern = { schemaVersion: 1, cycle: [{ intervals }] };
            absence.startsAt = new Date("2026-07-01T07:00:00Z");
            absence.endsAt = new Date("2026-07-01T17:00:00Z");
            const pattern = structuredClone(absence.employee.workSchedule!.pattern);
            const exceptions = [{ date: "2026-07-01", shortenedByMinutes: 300 }] as Entities.WorkCalendarException[];

            // Act
            absence.calculate({ exceptions });

            // Assert
            expect(absence.quantity).toBe("120.000000");
            expect(absence.employee.workSchedule!.pattern).toEqual(pattern);
        });

        it("[case] - skips a shift lost to the DST gap before shortening earlier intervals", () => {
            // Arrange
            const absence = calculated(LeaveUnit.MINUTE, "SCHEDULED_MINUTES");
            absence.employee.workSchedule!.pattern = {
                schemaVersion: 1,
                cycle: [
                    {
                        intervals: [
                            { start: "00:00", end: "01:00", endDayOffset: 0 },
                            { start: "01:30", end: "02:00", endDayOffset: 0 },
                        ],
                    },
                ],
            };
            absence.startsAt = new Date("2026-03-29T00:00:00Z");
            absence.endsAt = new Date("2026-03-29T05:00:00Z");
            const exceptions = [{ date: "2026-03-29", shortenedByMinutes: 30 }] as Entities.WorkCalendarException[];

            // Act
            absence.calculate({ exceptions });

            // Assert
            expect(absence.quantity).toBe("30.000000");
        });

        it("[case] - honors weekly schedules, transferred workdays and calendar application", () => {
            // Arrange
            const absence = calculated(LeaveUnit.MINUTE, "SCHEDULED_MINUTES");
            const schedule = absence.employee.workSchedule!;
            schedule.patternType = SchedulePattern.WEEKLY;
            schedule.pattern = {
                schemaVersion: 1,
                week: {
                    1: { intervals: [] },
                    2: { intervals: [] },
                    3: { intervals: [] },
                    4: { intervals: [] },
                    5: { intervals: [] },
                    6: { intervals: [] },
                    7: { intervals: [] },
                },
                transferredWorkday: { intervals: [{ start: "10:00", end: "14:00", endDayOffset: 0 }] },
            };
            absence.startsAt = new Date("2026-07-04T08:00:00Z");
            absence.endsAt = new Date("2026-07-04T17:00:00Z");
            const exceptions = [
                { date: "2026-07-04", workdayOverride: DayOverride.WORKDAY },
            ] as Entities.WorkCalendarException[];

            // Act
            absence.calculate({ exceptions });

            // Assert
            expect(absence.quantity).toBe("240.000000");
            schedule.calendarApplication = CalendarApplication.KEEP_CYCLE;
            absence.employee.workCalendar!.verifiedThrough = undefined;
            expect(() => absence.calculate({ exceptions })).toThrow("EMPTY_PERIOD");
        });

        it("[case] - rejects unverified calendar periods and periods before current terms", () => {
            // Arrange
            const absence = calculated(LeaveUnit.DAY, "CALENDAR_EXCLUDING_PUBLIC_HOLIDAYS");
            absence.employee.workCalendar!.verifiedThrough = "2025-12-31";

            // Act / Assert
            expect(() => absence.calculate({ exceptions: [] })).toThrow("UNVERIFIED_CALENDAR");
            absence.employee.termsValidFrom = "2026-02-01";
            expect(() => absence.calculate({ exceptions: [] })).toThrow("TERMS_PERIOD_MISMATCH");
        });
    });

    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createAbsence();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
            const props: Partial<Entities.Absence.ConstructorProps> = {
                status: AbsenceStatus.CANCELLED,
                sourceItemKey: "item-2",
                calculationSnapshot: { minutes: 60 },
                poolCode: "overtime",
                quantity: "60",
                unit: LeaveUnit.MINUTE,
                timezone: "UTC",
                startDate: "2026-10-01",
                endDate: "2026-10-02",
                startsAt: new Date("2026-10-01T09:00:00Z"),
                endsAt: new Date("2026-10-01T10:00:00Z"),
                organization,
                employee: stubEmployee(),
                leavePolicy: stubPolicy(),
                sourceRequest: stubRequest(),
                cancelledByRequest: stubRequest({ id: "cancellation" }),
            };

            // Act
            const entity = createAbsence(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("[case] - initializes independent empty relation collections", () => {
            // Arrange

            // Act
            const entity = createAbsence();
            const other = createAbsence();
            const result = entity.leaveLedgerEntries.getItems();

            // Assert
            expect(result).toEqual([]);
            expect(entity.leaveLedgerEntries).not.toBe(other.leaveLedgerEntries);
        });
    });

    describe("[Method] - advanceStatus", () => {
        it("[case] - rejects starting before the local start date", () => {
            // Arrange
            const entity = createAbsence();

            // Act
            const act = (): unknown => entity.advanceStatus({ at: new Date("2026-01-10T04:59:59Z") });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
        });

        it("[case] - starts on the local date and rejects early completion", () => {
            // Arrange
            const entity = createAbsence();

            // Act
            entity.advanceStatus({ at: new Date("2026-01-10T05:00:00Z") });
            const act = (): unknown => entity.advanceStatus({ at: new Date("2026-01-12T04:59:59Z") });

            // Assert
            expect(entity.status).toBe(AbsenceStatus.IN_PROGRESS);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            expect(act).toThrow("NO_CHANGES_DETECTED");
        });

        it("[case] - completes at the exclusive local end date", () => {
            // Arrange
            const entity = createAbsence();
            entity.advanceStatus({ at: new Date("2026-01-10T05:00:00Z") });

            // Act
            entity.advanceStatus({ at: new Date("2026-01-12T05:00:00Z") });

            // Assert
            expect(entity.status).toBe(AbsenceStatus.COMPLETED);
        });

        it("[case] - rejects starting before the exact start instant", () => {
            // Arrange
            const entity = createAbsence({
                unit: LeaveUnit.MINUTE,
                startsAt: new Date("2026-01-10T10:00:00Z"),
                endsAt: new Date("2026-01-10T11:00:00Z"),
            });

            // Act
            const act = (): unknown => entity.advanceStatus({ at: new Date("2026-01-10T09:59:59Z") });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
        });

        it("[case] - starts at the exact start instant", () => {
            // Arrange
            const entity = createAbsence({
                unit: LeaveUnit.MINUTE,
                startsAt: new Date("2026-01-10T10:00:00Z"),
                endsAt: new Date("2026-01-10T11:00:00Z"),
            });

            // Act
            entity.advanceStatus({ at: new Date("2026-01-10T10:00:00Z") });

            // Assert
            expect(entity.status).toBe(AbsenceStatus.IN_PROGRESS);
        });

        it("[case] - completes at the exact end instant", () => {
            // Arrange
            const entity = createAbsence({
                unit: LeaveUnit.MINUTE,
                startsAt: new Date("2026-01-10T10:00:00Z"),
                endsAt: new Date("2026-01-10T11:00:00Z"),
            });
            entity.advanceStatus({ at: new Date("2026-01-10T10:00:00Z") });

            // Act
            entity.advanceStatus({ at: new Date("2026-01-10T11:00:00Z") });

            // Assert
            expect(entity.status).toBe(AbsenceStatus.COMPLETED);
        });

        it("[case] - completes a scheduled absence when the entire period has elapsed", () => {
            // Arrange
            const entity = createAbsence();

            // Act
            entity.advanceStatus({ at: new Date("2026-01-13T00:00:00Z") });

            // Assert
            expect(entity.status).toBe(AbsenceStatus.COMPLETED);
        });

        it("[case] - never moves an in-progress absence back to scheduled", () => {
            // Arrange
            const entity = createAbsence({ status: AbsenceStatus.IN_PROGRESS });

            // Act
            const act = (): unknown => entity.advanceStatus({ at: new Date("2026-01-01T00:00:00Z") });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
            expect(entity.status).toBe(AbsenceStatus.IN_PROGRESS);
        });

        it.each([AbsenceStatus.COMPLETED, AbsenceStatus.CANCELLED])("[case] - rejects terminal status %s", (status) => {
            // Arrange

            // Act
            const act = (): unknown => createAbsence({ status }).advanceStatus({ at: new Date("2026-01-13T00:00:00Z") });

            // Assert
            expect(act).toThrow("INVALID_STATUS");
        });
    });

    describe("[Method] - cancel", () => {
        function cancellation(): Entities.HRRequest {
            return stubRequest({
                type: HRRequestType.CANCEL_REQUEST,
                relatedRequest: stubRequest(),
                status: HRRequestStatus.APPROVED,
                revision: 2,
                approvedRevision: 2,
            });
        }
        it.each([AbsenceStatus.SCHEDULED, AbsenceStatus.IN_PROGRESS, AbsenceStatus.COMPLETED])(
            "[case] - cancels status %s with a current approved request",
            (status) => {
                // Arrange
                const entity = createAbsence({ status });
                const request = cancellation();

                // Act
                entity.cancel({ request });
                const act = (): unknown => entity.cancel({ request });

                // Assert
                expect(entity.status).toBe(AbsenceStatus.CANCELLED);
                expect(entity.cancelledByRequest).toBe(request);
                expect(entity.updatedAt).toBeInstanceOf(Date);
                expect(act).toThrow("INVALID_STATUS");
            },
        );
        it.each(["organization", "employee", "type", "related", "missingRelated"])(
            "[case] - rejects mismatched %s",
            (reason) => {
                // Arrange
                const request = cancellation();
                if (reason === "organization") {
                    request.organization = { id: "other", realm: "realm" };
                }
                if (reason === "employee") {
                    request.employee = stubEmployee({ id: "other" });
                }
                if (reason === "type") {
                    request.type = HRRequestType.ABSENCE;
                }
                if (reason === "related") {
                    request.relatedRequest = stubRequest({ id: "other" });
                }
                if (reason === "missingRelated") {
                    request.relatedRequest = undefined;
                }

                // Act
                const act = (): unknown => createAbsence().cancel({ request });

                // Assert
                expect(act).toThrow("REQUEST_MISMATCH");
            },
        );
        it.each(["status", "revision"])("[case] - rejects an unapproved or stale %s", (reason) => {
            // Arrange
            const request = cancellation();
            if (reason === "status") {
                request.status = HRRequestStatus.SUBMITTED;
            } else {
                request.revision++;
            }

            // Act
            const act = (): unknown => createAbsence().cancel({ request });

            // Assert
            expect(act).toThrow("INVALID_REQUEST_STATUS");
        });
    });

    describe("[Method] - canCreate", () => {
        it("[case] - accepts matching relations and pool", () => {
            // Arrange

            // Act
            const act = (): unknown => createAbsence({ cancelledByRequest: stubRequest() }).canCreate();
            const act1 = (): unknown => createAbsence().canCreate();

            // Assert
            expect(act).not.toThrow();
            expect(act1).not.toThrow();
        });

        it.each(["employee", "leavePolicy", "sourceRequest", "cancelledByRequest"] as const)(
            "[case] - rejects a foreign %s",
            (field) => {
                // Arrange
                const entity = createAbsence();
                Object.assign(entity, { [field]: { organization: { id: "other" } } });

                // Act
                const act = (): unknown => entity.canCreate();

                // Assert
                expect(act).toThrow("ORGANIZATION_MISMATCH");
            },
        );
        it.each(["sourceRequest", "cancelledByRequest"] as const)("[case] - rejects another employee in %s", (field) => {
            // Arrange

            // Act
            const act = (): unknown =>
                createAbsence({ [field]: stubRequest({ employee: stubEmployee({ id: "other" }) }) }).canCreate();

            // Assert
            expect(act).toThrow("REQUEST_MISMATCH");
        });

        it("[case] - rejects an unknown pool or wrong unit", () => {
            // Arrange

            // Act
            const act = (): unknown => createAbsence({ poolCode: "other" }).canCreate();
            const act1 = (): unknown => createAbsence({ unit: LeaveUnit.MINUTE }).canCreate();

            // Assert
            expect(act).toThrow("INVALID_POOL");
            expect(act1).toThrow("INVALID_POOL");
        });
    });
});
