import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { HRRequestStatus, HRExecutionStatus, HRRequestType } from "~context/enums";

import { HRRequest } from "./hr-request.entity";

const organization = { id: "organization", realm: "realm" };

function stubEmployee(overrides?: Partial<Entities.Employee>): Entities.Employee {
    return { id: "employee", organization, ...overrides } as Entities.Employee;
}

function stubRequest(overrides?: Partial<Entities.HRRequest>): Entities.HRRequest {
    return { id: "request", organization, employee: stubEmployee(), ...overrides } as Entities.HRRequest;
}

function createHRRequest(overrides?: Partial<Entities.HRRequest.ConstructorProps>): HRRequest {
    return new HRRequest({
        organization,
        employee: stubEmployee(),
        initiatorAccount: "account",
        idempotencyKey: "hire-001",
        type: HRRequestType.HIRE,
        status: HRRequestStatus.DRAFT,
        executionStatus: HRExecutionStatus.NOT_STARTED,
        revision: 1,
        payloadSchemaVersion: 1,
        payload: {},
        ...overrides,
    });
}

describe("HRRequest Entity", () => {
    describe("constructor", () => {
        it("should generate identity and creation metadata", () => {
            const entity = createHRRequest();

            expect(isUUID(entity.id, "4")).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should assign supplied fields and relations", () => {
            const props: Partial<Entities.HRRequest.ConstructorProps> = {
                type: HRRequestType.TRANSFER,
                status: HRRequestStatus.APPROVED,
                executionStatus: HRExecutionStatus.APPLIED,
                revision: 4,
                approvedRevision: 4,
                appliedRevision: 4,
                payloadSchemaVersion: 2,
                payload: { position: "lead" },
                result: { applied: true },
                failure: "previous failure",
                workflowCode: "transfer",
                workflowVersion: 3,
                idempotencyKey: "transfer-001",
                initiatorAccount: "account",
                effectiveAt: new Date("2026-10-01T00:00:00Z"),
                submittedAt: new Date("2026-09-01T00:00:00Z"),
                approvedAt: new Date("2026-09-02T00:00:00Z"),
                appliedAt: new Date("2026-10-01T00:00:00Z"),
                organization,
                employee: stubEmployee(),
                initiatorEmployee: stubEmployee({ id: "initiator" }),
                relatedRequest: stubRequest(),
                targetPosition: { organization } as Entities.Position,
            };
            const entity = createHRRequest(props);

            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("should initialize independent empty relation collections", () => {
            const entity = createHRRequest();
            const other = createHRRequest();

            expect(entity.createdPositionAssignments.getItems()).toEqual([]);
            expect(entity.createdPositionAssignments).not.toBe(other.createdPositionAssignments);
            expect(entity.closedPositionAssignments.getItems()).toEqual([]);
            expect(entity.closedPositionAssignments).not.toBe(other.closedPositionAssignments);
            expect(entity.replacedEmploymentHistory.getItems()).toEqual([]);
            expect(entity.replacedEmploymentHistory).not.toBe(other.replacedEmploymentHistory);
            expect(entity.leaveLedgerEntries.getItems()).toEqual([]);
            expect(entity.leaveLedgerEntries).not.toBe(other.leaveLedgerEntries);
            expect(entity.approvalSteps.getItems()).toEqual([]);
            expect(entity.approvalSteps).not.toBe(other.approvalSteps);
            expect(entity.relatedRequests.getItems()).toEqual([]);
            expect(entity.relatedRequests).not.toBe(other.relatedRequests);
            expect(entity.cancelledAbsences.getItems()).toEqual([]);
            expect(entity.cancelledAbsences).not.toBe(other.cancelledAbsences);
            expect(entity.createdAbsences.getItems()).toEqual([]);
            expect(entity.createdAbsences).not.toBe(other.createdAbsences);
        });
    });

    describe("update", () => {
        it("should update multiple fields and increment revision once", () => {
            const entity = createHRRequest();
            const payload = { contractType: "permanent" };
            entity.update({ patch: { payload, payloadSchemaVersion: 2, effectiveAt: undefined } });

            expect(entity.payload).toBe(payload);
            expect(entity.payloadSchemaVersion).toBe(2);
            expect(entity.revision).toBe(2);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("should reject empty or unchanged patches without incrementing revision", () => {
            const entity = createHRRequest();

            expect(() => entity.update({ patch: {} })).toThrow("EMPTY_UPDATE_PATCH");
            expect(() => entity.update({ patch: { payload: entity.payload } })).toThrow("NO_CHANGES_DETECTED");
            expect(() => entity.update({ patch: { effectiveAt: undefined } })).toThrow("NO_CHANGES_DETECTED");
            expect(entity.revision).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("should reject a foreign target position", () => {
            const entity = createHRRequest();

            expect(() =>
                entity.update({ patch: { targetPosition: { organization: { id: "other" } } as Entities.Position } }),
            ).toThrow("ORGANIZATION_MISMATCH");
        });
    });

    describe.each(["update", "submit"] as const)("%s draft guards", (method) => {
        it.each(["status", "execution"])("should reject invalid %s", (field) => {
            const entity = createHRRequest();
            if (field === "status") {
                entity.status = HRRequestStatus.SUBMITTED;
            } else {
                entity.executionStatus = HRExecutionStatus.RUNNING;
            }
            const invoke = (): void =>
                method === "update"
                    ? entity.update({ patch: { payloadSchemaVersion: 2 } })
                    : entity.submit({ workflowCode: "hire", workflowVersion: 1 });

            expect(invoke).toThrow("INVALID_STATUS");
        });
    });

    describe("submit", () => {
        it("should save workflow and submission timestamps", () => {
            const entity = createHRRequest();
            entity.submit({ workflowCode: "hire", workflowVersion: 3 });

            expect(entity).toMatchObject({ status: HRRequestStatus.SUBMITTED, workflowCode: "hire", workflowVersion: 3 });
            expect(entity.submittedAt).toBeInstanceOf(Date);
            expect(entity.updatedAt).toBe(entity.submittedAt);
        });

        it("should validate relations before submission", () => {
            const entity = createHRRequest({ employee: stubEmployee({ organization: { id: "other", realm: "realm" } }) });

            expect(() => entity.submit({ workflowCode: "hire", workflowVersion: 1 })).toThrow("ORGANIZATION_MISMATCH");
            expect(entity.status).toBe(HRRequestStatus.DRAFT);
        });
    });

    describe.each([
        ["withdraw", HRRequestStatus.WITHDRAWN],
        ["approve", HRRequestStatus.APPROVED],
        ["reject", HRRequestStatus.REJECTED],
        ["returnForRevision", HRRequestStatus.DRAFT],
    ] as const)("%s", (method, expected) => {
        it("should transition a submitted request", () => {
            const entity = createHRRequest({ status: HRRequestStatus.SUBMITTED, revision: 3 });
            entity[method]();

            expect(entity.status).toBe(expected);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            if (method === "approve") {
                expect(entity.approvedRevision).toBe(3);
                expect(entity.approvedAt).toBe(entity.updatedAt);
            }
        });

        it("should reject a resolved request", () => {
            expect(() => createHRRequest({ status: HRRequestStatus.REJECTED })[method]()).toThrow("INVALID_STATUS");
        });
    });

    describe("withdraw", () => {
        it("should also withdraw a draft", () => {
            const entity = createHRRequest();
            entity.withdraw();

            expect(entity.status).toBe(HRRequestStatus.WITHDRAWN);
        });
    });

    describe("returnForRevision", () => {
        it("should clear approval and workflow data and increment the revision", () => {
            const entity = createHRRequest({
                status: HRRequestStatus.SUBMITTED,
                workflowCode: "hire",
                workflowVersion: 3,
                submittedAt: new Date(),
                approvedAt: new Date(),
                approvedRevision: 1,
            });
            entity.returnForRevision();

            expect(entity.revision).toBe(2);
            expect(entity.workflowCode).toBeUndefined();
            expect(entity.workflowVersion).toBeUndefined();
            expect(entity.submittedAt).toBeUndefined();
            expect(entity.approvedAt).toBeUndefined();
            expect(entity.approvedRevision).toBeUndefined();
        });
    });

    describe.each(["cancel", "scheduleApplication", "markApplied", "markFailed", "canApply", "beginApplication"] as const)(
        "%s approval guards",
        (method) => {
            function invoke(entity: HRRequest): void {
                if (method === "scheduleApplication") {
                    entity.scheduleApplication({ effectiveAt: new Date(0) });
                } else if (method === "markApplied") {
                    entity.markApplied({ result: {} });
                } else if (method === "markFailed") {
                    entity.markFailed({ reason: "failure" });
                } else {
                    entity[method]();
                }
            }
            it("should reject an unapproved request", () => {
                expect(() => invoke(createHRRequest())).toThrow("INVALID_STATUS");
            });
            it("should reject an outdated approval", () => {
                expect(() => invoke(createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 2 }))).toThrow(
                    "STALE_REVISION",
                );
            });
            it("should reject an incompatible execution state", () => {
                const executionStatus = method === "cancel" ? HRExecutionStatus.RUNNING : HRExecutionStatus.APPLIED;

                expect(() =>
                    invoke(createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 1, executionStatus })),
                ).toThrow("INVALID_EXECUTION_STATUS");
            });
        },
    );
    describe("application", () => {
        it("should schedule, run, fail, retry and apply an approved revision", () => {
            const entity = createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 1 });
            const effectiveAt = new Date(0);
            entity.scheduleApplication({ effectiveAt });

            expect(entity.executionStatus).toBe(HRExecutionStatus.SCHEDULED);
            expect(entity.effectiveAt).toBe(effectiveAt);
            entity.beginApplication();

            expect(entity.executionStatus).toBe(HRExecutionStatus.RUNNING);
            entity.markFailed({ reason: "retryable" });

            expect(entity.executionStatus).toBe(HRExecutionStatus.FAILED);
            expect(entity.failure).toBe("retryable");
            entity.beginApplication();

            expect(entity.failure).toBeUndefined();
            const result = { employee: "employee" };
            entity.markApplied({ result });

            expect(entity.executionStatus).toBe(HRExecutionStatus.APPLIED);
            expect(entity.appliedRevision).toBe(1);
            expect(entity.appliedAt).toBeInstanceOf(Date);
            expect(entity.appliedAt).toBe(entity.updatedAt);
            expect(entity.result).toBe(result);
            expect(entity.failure).toBeUndefined();
        });

        it("should allow application without a schedule or result", () => {
            const entity = createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 1 });
            entity.beginApplication();
            entity.markApplied({});

            expect(entity.result).toBeUndefined();
            expect(entity.executionStatus).toBe(HRExecutionStatus.APPLIED);
        });

        it("should reject application before the effective time", () => {
            const entity = createHRRequest({
                status: HRRequestStatus.APPROVED,
                approvedRevision: 1,
                effectiveAt: new Date("2999-01-01T00:00:00Z"),
            });

            expect(() => entity.canApply()).toThrow("APPLICATION_NOT_DUE");
            expect(() => entity.beginApplication()).toThrow("APPLICATION_NOT_DUE");
            expect(entity.executionStatus).toBe(HRExecutionStatus.NOT_STARTED);
        });
    });

    describe("cancel", () => {
        it.each([HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED, HRExecutionStatus.APPLIED])(
            "should cancel execution state %s",
            (executionStatus) => {
                const entity = createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 1, executionStatus });
                entity.cancel();

                expect(entity.status).toBe(HRRequestStatus.CANCELLED);
                expect(entity.executionStatus).toBe(executionStatus);
                expect(entity.updatedAt).toBeInstanceOf(Date);
            },
        );
    });

    describe.each(["update", "canCreate"] as const)("%s related request guards", (method) => {
        it.each(["self", "organization", "employee"])("should reject a related request with mismatched %s", (reason) => {
            const entity = createHRRequest();
            const request = reason === "self" ? entity : stubRequest();
            if (reason === "organization") {
                request.organization = { id: "other", realm: "realm" };
            }
            if (reason === "employee") {
                request.employee = stubEmployee({ id: "other" });
            }
            const invoke = (): void => {
                if (method === "update") {
                    entity.update({ patch: { relatedRequest: request } });
                } else {
                    entity.relatedRequest = request;
                    entity.canCreate();
                }
            };

            expect(invoke).toThrow("REQUEST_MISMATCH");
        });

        it("should accept a matching related request", () => {
            const entity = createHRRequest();
            const request = stubRequest();
            if (method === "update") {
                entity.update({ patch: { relatedRequest: request } });
            } else {
                entity.relatedRequest = request;
                entity.canCreate();
            }
            expect(entity.relatedRequest).toBe(request);
        });
    });

    describe("canCreate", () => {
        it("should accept a draft and a consistently applied or cancelled request", () => {
            expect(() => createHRRequest().canCreate()).not.toThrow();
            for (const status of [HRRequestStatus.APPROVED, HRRequestStatus.CANCELLED]) {
                expect(() =>
                    createHRRequest({
                        status,
                        approvedRevision: 1,
                        appliedRevision: 1,
                        executionStatus: HRExecutionStatus.APPLIED,
                    }).canCreate(),
                ).not.toThrow();
            }
        });

        it("should reject stale approval", () => {
            expect(() => createHRRequest({ status: HRRequestStatus.APPROVED }).canCreate()).toThrow("STALE_REVISION");
        });

        it("should reject inconsistent execution states and revisions", () => {
            expect(() => createHRRequest({ executionStatus: HRExecutionStatus.RUNNING }).canCreate()).toThrow(
                "INVALID_EXECUTION_STATUS",
            );
            expect(() =>
                createHRRequest({
                    status: HRRequestStatus.CANCELLED,
                    executionStatus: HRExecutionStatus.SCHEDULED,
                    approvedRevision: 2,
                }).canCreate(),
            ).toThrow("INVALID_EXECUTION_STATUS");

            expect(() =>
                createHRRequest({
                    status: HRRequestStatus.APPROVED,
                    approvedRevision: 1,
                    appliedRevision: 2,
                    executionStatus: HRExecutionStatus.APPLIED,
                }).canCreate(),
            ).toThrow("INVALID_EXECUTION_STATUS");
        });

        it.each(["employee", "initiatorEmployee", "targetPosition"] as const)("should reject a foreign %s", (field) => {
            const entity = createHRRequest();
            Object.assign(entity, { [field]: { organization: { id: "other" } } });

            expect(() => entity.canCreate()).toThrow("ORGANIZATION_MISMATCH");
        });
    });
});
