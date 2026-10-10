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

describe("[Entity] - Absence", () => {
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
