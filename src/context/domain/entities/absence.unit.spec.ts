import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { AbsenceStatus, LeaveUnit, HRRequestStatus, HRRequestType } from "~context/enums";

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

describe("Absence Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createAbsence();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
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
            const entity = createAbsence(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("should initialize independent empty relation collections", () => {
            const entity = createAbsence();
            const other = createAbsence();

            expect(entity.leaveLedgerEntries.getItems()).toEqual([]);
            expect(entity.leaveLedgerEntries).not.toBe(other.leaveLedgerEntries);
        });
    });

    describe("advanceStatus", () => {
        it("should use local calendar dates and complete at the exclusive end date", () => {
            const entity = createAbsence();

            expect(() => entity.advanceStatus({ at: new Date("2026-01-10T04:59:59Z") })).toThrow("NO_CHANGES_DETECTED");
            entity.advanceStatus({ at: new Date("2026-01-10T05:00:00Z") });

            expect(entity.status).toBe(AbsenceStatus.IN_PROGRESS);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            expect(() => entity.advanceStatus({ at: new Date("2026-01-12T04:59:59Z") })).toThrow("NO_CHANGES_DETECTED");
            entity.advanceStatus({ at: new Date("2026-01-12T05:00:00Z") });

            expect(entity.status).toBe(AbsenceStatus.COMPLETED);
        });

        it("should use exact instants for minute-based absences", () => {
            const entity = createAbsence({
                unit: LeaveUnit.MINUTE,
                startsAt: new Date("2026-01-10T10:00:00Z"),
                endsAt: new Date("2026-01-10T11:00:00Z"),
            });

            expect(() => entity.advanceStatus({ at: new Date("2026-01-10T09:59:59Z") })).toThrow("NO_CHANGES_DETECTED");
            entity.advanceStatus({ at: new Date("2026-01-10T10:00:00Z") });

            expect(entity.status).toBe(AbsenceStatus.IN_PROGRESS);
            entity.advanceStatus({ at: new Date("2026-01-10T11:00:00Z") });

            expect(entity.status).toBe(AbsenceStatus.COMPLETED);
        });

        it("should complete a scheduled absence when the entire period has elapsed", () => {
            const entity = createAbsence();
            entity.advanceStatus({ at: new Date("2026-01-13T00:00:00Z") });

            expect(entity.status).toBe(AbsenceStatus.COMPLETED);
        });

        it("should never move an in-progress absence back to scheduled", () => {
            const entity = createAbsence({ status: AbsenceStatus.IN_PROGRESS });

            expect(() => entity.advanceStatus({ at: new Date("2026-01-01T00:00:00Z") })).toThrow("NO_CHANGES_DETECTED");
            expect(entity.status).toBe(AbsenceStatus.IN_PROGRESS);
        });

        it.each([AbsenceStatus.COMPLETED, AbsenceStatus.CANCELLED])("should reject terminal status %s", (status) => {
            expect(() => createAbsence({ status }).advanceStatus({ at: new Date("2026-01-13T00:00:00Z") })).toThrow(
                "INVALID_STATUS",
            );
        });
    });

    describe("cancel", () => {
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
            "should cancel status %s with a current approved request",
            (status) => {
                const entity = createAbsence({ status });
                const request = cancellation();
                entity.cancel({ request });

                expect(entity.status).toBe(AbsenceStatus.CANCELLED);
                expect(entity.cancelledByRequest).toBe(request);
                expect(entity.updatedAt).toBeInstanceOf(Date);
                expect(() => entity.cancel({ request })).toThrow("INVALID_STATUS");
            },
        );
        it.each(["organization", "employee", "type", "related", "missingRelated"])(
            "should reject mismatched %s",
            (reason) => {
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
                expect(() => createAbsence().cancel({ request })).toThrow("REQUEST_MISMATCH");
            },
        );
        it.each(["status", "revision"])("should reject an unapproved or stale %s", (reason) => {
            const request = cancellation();
            if (reason === "status") {
                request.status = HRRequestStatus.SUBMITTED;
            } else {
                request.revision++;
            }
            expect(() => createAbsence().cancel({ request })).toThrow("INVALID_REQUEST_STATUS");
        });
    });

    describe("canCreate", () => {
        it("should accept matching relations and pool", () => {
            expect(() => createAbsence({ cancelledByRequest: stubRequest() }).canCreate()).not.toThrow();
            expect(() => createAbsence().canCreate()).not.toThrow();
        });

        it.each(["employee", "leavePolicy", "sourceRequest", "cancelledByRequest"] as const)(
            "should reject a foreign %s",
            (field) => {
                const entity = createAbsence();
                Object.assign(entity, { [field]: { organization: { id: "other" } } });

                expect(() => entity.canCreate()).toThrow("ORGANIZATION_MISMATCH");
            },
        );
        it.each(["sourceRequest", "cancelledByRequest"] as const)("should reject another employee in %s", (field) => {
            expect(() =>
                createAbsence({ [field]: stubRequest({ employee: stubEmployee({ id: "other" }) }) }).canCreate(),
            ).toThrow("REQUEST_MISMATCH");
        });

        it("should reject an unknown pool or wrong unit", () => {
            expect(() => createAbsence({ poolCode: "other" }).canCreate()).toThrow("INVALID_POOL");
            expect(() => createAbsence({ unit: LeaveUnit.MINUTE }).canCreate()).toThrow("INVALID_POOL");
        });
    });
});
