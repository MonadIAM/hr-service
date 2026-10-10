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

describe("[Entity] - HRApprovalDecision", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createHRApprovalDecision();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
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

            // Act
            const entity = createHRApprovalDecision(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });
    });

    describe("[Method] - canCreate", () => {
        it.each([
            [HRDecisionKind.APPROVE, HRApprovalStatus.APPROVED],
            [HRDecisionKind.REJECT, HRApprovalStatus.REJECTED],
            [HRDecisionKind.RETURN, HRApprovalStatus.RETURNED],
        ])("[case] - accepts %s for an active step", (decision) => {
            // Arrange
            const entity = createHRApprovalDecision({ decision });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it.each([
            [HRDecisionKind.APPROVE, HRApprovalStatus.APPROVED],
            [HRDecisionKind.REJECT, HRApprovalStatus.REJECTED],
            [HRDecisionKind.RETURN, HRApprovalStatus.RETURNED],
        ])("[case] - accepts %s for a matching resolved step", (decision, status) => {
            // Arrange
            const entity = createHRApprovalDecision({ decision });
            entity.step.status = status;

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).not.toThrow();
        });

        it.each([
            [HRDecisionKind.APPROVE, HRApprovalStatus.APPROVED],
            [HRDecisionKind.REJECT, HRApprovalStatus.REJECTED],
            [HRDecisionKind.RETURN, HRApprovalStatus.RETURNED],
        ])("[case] - rejects %s for a skipped step", (decision, status) => {
            // Arrange
            const entity = createHRApprovalDecision({ decision });
            entity.step.status = status;
            entity.step.status = HRApprovalStatus.SKIPPED;

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("INVALID_STATUS");
        });

        it.each(["step", "actorEmployee"] as const)("[case] - rejects a foreign %s", (field) => {
            // Arrange
            const entity = createHRApprovalDecision();
            entity[field].organization = { id: "other", realm: "realm" };

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("ORGANIZATION_MISMATCH");
        });

        it.each(["request", "stepRevision", "requestRevision"])("[case] - rejects stale %s", (field) => {
            // Arrange
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

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("STALE_REVISION");
        });

        it.each(["employee", "account", "status"])("[case] - rejects invalid actor %s", (field) => {
            // Arrange
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

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("INVALID_ACTOR");
        });

        it("[case] - rejects a request that is no longer submitted", () => {
            // Arrange
            const entity = createHRApprovalDecision();
            entity.step.request.status = HRRequestStatus.APPROVED;

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("INVALID_REQUEST_STATUS");
        });
    });
});
