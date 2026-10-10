import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { Employment } from "./employment.entity";

const organization = { id: "organization", realm: "realm" };

function stubEmployee(overrides?: Partial<Entities.Employee>): Entities.Employee {
    return { id: "employee", organization, ...overrides } as Entities.Employee;
}

function stubRequest(overrides?: Partial<Entities.HRRequest>): Entities.HRRequest {
    return { id: "request", organization, employee: stubEmployee(), ...overrides } as Entities.HRRequest;
}

function createEmployment(overrides?: Partial<Entities.Employment.ConstructorProps>): Employment {
    return new Employment({
        organization,
        employee: stubEmployee(),
        validFrom: "2026-01-01",
        validTo: "2026-06-01",
        termsRevision: 2,
        termsSnapshot: { contractType: "permanent" },
        ...overrides,
    });
}

describe("[Entity] - Employment", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createEmployment();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
            const props: Partial<Entities.Employment.ConstructorProps> = {
                validFrom: "2026-01-01",
                validTo: "2026-06-01",
                termsRevision: 3,
                termsSnapshot: { contract: "fixed" },
                organization,
                employee: stubEmployee(),
                replacedByRequest: stubRequest(),
                workCalendar: { organization } as Entities.WorkCalendar,
                workSchedule: { organization } as Entities.WorkSchedule,
                leavePolicy: { organization } as Entities.LeavePolicy,
            };

            // Act
            const entity = createEmployment(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("[Method] - canCreate", () => {
        it("[case] - accepts omitted optional relations", () => {
            // Arrange

            // Act
            const act = (): unknown => createEmployment().canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it.each(["employee", "workCalendar", "workSchedule", "leavePolicy", "replacedByRequest"] as const)(
            "[case] - rejects a foreign %s",
            (field) => {
                // Arrange
                const entity = createEmployment();
                Object.assign(entity, { [field]: { organization: { id: "other" } } });

                // Act
                const act = (): unknown => entity.canCreate();

                // Assert
                expect(act).toThrow("ORGANIZATION_MISMATCH");
            },
        );
        it("[case] - accepts matching relations", () => {
            // Arrange
            const request = stubRequest();
            const entity = createEmployment({
                replacedByRequest: request,
                workCalendar: { organization } as Entities.WorkCalendar,
                workSchedule: { organization } as Entities.WorkSchedule,
                leavePolicy: { organization } as Entities.LeavePolicy,
            });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it("[case] - rejects a request for another employee", () => {
            // Arrange
            const request = stubRequest();
            const entity = createEmployment({
                replacedByRequest: request,
                workCalendar: { organization } as Entities.WorkCalendar,
                workSchedule: { organization } as Entities.WorkSchedule,
                leavePolicy: { organization } as Entities.LeavePolicy,
            });
            request.employee = stubEmployee({ id: "other" });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("REQUEST_MISMATCH");
        });
    });
});
