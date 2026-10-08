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

describe("Employment Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createEmployment();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
        });

        it("should assign supplied fields and relations", () => {
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
            const entity = createEmployment(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("canCreate", () => {
        it("should accept omitted optional relations", () => {
            expect(() => createEmployment().canCreate()).not.toThrow();
        });

        it.each(["employee", "workCalendar", "workSchedule", "leavePolicy", "replacedByRequest"] as const)(
            "should reject a foreign %s",
            (field) => {
                const entity = createEmployment();
                Object.assign(entity, { [field]: { organization: { id: "other" } } });

                expect(() => entity.canCreate()).toThrow("ORGANIZATION_MISMATCH");
            },
        );
        it("should accept matching relations and reject a request for another employee", () => {
            const request = stubRequest();
            const entity = createEmployment({
                replacedByRequest: request,
                workCalendar: { organization } as Entities.WorkCalendar,
                workSchedule: { organization } as Entities.WorkSchedule,
                leavePolicy: { organization } as Entities.LeavePolicy,
            });

            expect(() => entity.canCreate()).not.toThrow();
            request.employee = stubEmployee({ id: "other" });

            expect(() => entity.canCreate()).toThrow("REQUEST_MISMATCH");
        });
    });
});
