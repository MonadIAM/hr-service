import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { HRDecisionKind, HRApprovalStatus, HRRequestStatus, EmployeeStatus } from "~context/enums";

import { HRApprovalDecision } from "./hr-approval-decision.entity";

const organization = { id: "organization", realm: "realm" };

function stubEmployee(overrides?: Partial<Entities.Employee>): Entities.Employee {
    return { id: "employee", organization, ...overrides } as Entities.Employee;
}

function stubRequest(overrides?: Partial<Entities.HRRequest>): Entities.HRRequest {
    return { id: "request", organization, employee: stubEmployee(), ...overrides } as Entities.HRRequest;
}

function createHRApprovalDecision(overrides?: Partial<Entities.HRApprovalDecision.ConstructorProps>): HRApprovalDecision {
    return new HRApprovalDecision({
        organization,
        decision: HRDecisionKind.APPROVE,
        actorAccount: "account",
        request: "request",
        requestRevision: 2,
        decidedAt: new Date("2026-10-06T12:00:00Z"),
        actorEmployee: stubEmployee({ account: "account", status: EmployeeStatus.ACTIVE }),
        step: {
            organization,
            status: HRApprovalStatus.ACTIVE,
            requestRevision: 2,
            assigneeEmployee: stubEmployee(),
            request: stubRequest({ revision: 2, status: HRRequestStatus.SUBMITTED }),
        } as Entities.HRApprovalStep,
        ...overrides,
    });
}

describe("HRApprovalDecision Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createHRApprovalDecision();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
        });

        it("should assign supplied fields and relations", () => {
            const props: Partial<Entities.HRApprovalDecision.ConstructorProps> = {
                decision: HRDecisionKind.RETURN,
                requestRevision: 3,
                actorAccount: "other-account",
                request: "other-request",
                comment: "Revise terms",
                decidedAt: new Date("2026-10-01T00:00:00Z"),
                organization,
                actorEmployee: stubEmployee(),
                step: { organization } as Entities.HRApprovalStep,
            };
            const entity = createHRApprovalDecision(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("canCreate", () => {
        it.each([
            [HRDecisionKind.APPROVE, HRApprovalStatus.APPROVED],
            [HRDecisionKind.REJECT, HRApprovalStatus.REJECTED],
            [HRDecisionKind.RETURN, HRApprovalStatus.RETURNED],
        ])("should accept %s for an active or matching resolved step", (decision, status) => {
            const entity = createHRApprovalDecision({ decision });

            expect(() => entity.canCreate()).not.toThrow();
            entity.step.status = status;

            expect(() => entity.canCreate()).not.toThrow();
            entity.step.status = HRApprovalStatus.SKIPPED;

            expect(() => entity.canCreate()).toThrow("INVALID_STATUS");
        });

        it.each(["step", "actorEmployee"] as const)("should reject a foreign %s", (field) => {
            const entity = createHRApprovalDecision();
            entity[field].organization = { id: "other", realm: "realm" };

            expect(() => entity.canCreate()).toThrow("ORGANIZATION_MISMATCH");
        });

        it.each(["request", "stepRevision", "requestRevision"])("should reject stale %s", (field) => {
            const entity = createHRApprovalDecision();
            if (field === "request") {
                entity.request = "other";
            }
            if (field === "stepRevision") {
                entity.step.requestRevision++;
            }
            if (field === "requestRevision") {
                entity.step.request.revision++;
            }
            expect(() => entity.canCreate()).toThrow("STALE_REVISION");
        });

        it.each(["employee", "account", "status"])("should reject invalid actor %s", (field) => {
            const entity = createHRApprovalDecision();
            if (field === "employee") {
                entity.actorEmployee.id = "other";
            }
            if (field === "account") {
                entity.actorAccount = "other";
            }
            if (field === "status") {
                entity.actorEmployee.status = EmployeeStatus.TERMINATED;
            }
            expect(() => entity.canCreate()).toThrow("INVALID_ACTOR");
        });

        it("should reject a request that is no longer submitted", () => {
            const entity = createHRApprovalDecision();
            entity.step.request.status = HRRequestStatus.APPROVED;

            expect(() => entity.canCreate()).toThrow("INVALID_REQUEST_STATUS");
        });
    });
});
