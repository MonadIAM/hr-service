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

describe("[Entity] - HRRequest", () => {
    describe("[Method] - constructor", () => {
        it("[case] - generates identity and creation metadata", () => {
            // Arrange

            // Act
            const entity = createHRRequest();
            const result = isUUID(entity.id, "4");

            // Assert
            expect(result).toBe(true);
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.version).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - assigns supplied fields and relations", () => {
            // Arrange
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

            // Act
            const entity = createHRRequest(props);

            // Assert
            expect(entity).toMatchObject(props);
            expect(entity.organization).toBe(props.organization);
        });

        it("[case] - initializes independent empty relation collections", () => {
            // Arrange

            // Act
            const entity = createHRRequest();
            const other = createHRRequest();
            const result = entity.createdPositionAssignments.getItems();
            const result1 = entity.createdPositionAssignments;
            const result2 = entity.closedPositionAssignments.getItems();
            const result3 = entity.closedPositionAssignments;
            const result4 = entity.replacedEmploymentHistory.getItems();
            const result5 = entity.replacedEmploymentHistory;
            const result6 = entity.leaveLedgerEntries.getItems();
            const result7 = entity.leaveLedgerEntries;
            const result8 = entity.approvalSteps.getItems();
            const result9 = entity.approvalSteps;
            const result10 = entity.relatedRequests.getItems();
            const result11 = entity.relatedRequests;
            const result12 = entity.cancelledAbsences.getItems();
            const result13 = entity.cancelledAbsences;
            const result14 = entity.createdAbsences.getItems();

            // Assert
            expect(result).toEqual([]);
            expect(result1).not.toBe(other.createdPositionAssignments);
            expect(result2).toEqual([]);
            expect(result3).not.toBe(other.closedPositionAssignments);
            expect(result4).toEqual([]);
            expect(result5).not.toBe(other.replacedEmploymentHistory);
            expect(result6).toEqual([]);
            expect(result7).not.toBe(other.leaveLedgerEntries);
            expect(result8).toEqual([]);
            expect(result9).not.toBe(other.approvalSteps);
            expect(result10).toEqual([]);
            expect(result11).not.toBe(other.relatedRequests);
            expect(result12).toEqual([]);
            expect(result13).not.toBe(other.cancelledAbsences);
            expect(result14).toEqual([]);
            expect(entity.createdAbsences).not.toBe(other.createdAbsences);
        });
    });

    describe("[Method] - update", () => {
        it("[case] - updates multiple fields and increment revision once", () => {
            // Arrange
            const entity = createHRRequest();
            const payload = { contractType: "permanent" };

            // Act
            entity.update({ patch: { payload, payloadSchemaVersion: 2, effectiveAt: undefined } });

            // Assert
            expect(entity.payload).toBe(payload);
            expect(entity.payloadSchemaVersion).toBe(2);
            expect(entity.revision).toBe(2);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - rejects empty or unchanged patches without incrementing revision", () => {
            // Arrange
            const entity = createHRRequest();

            // Act
            const act = (): unknown => entity.update({ patch: {} });
            const act1 = (): unknown => entity.update({ patch: { payload: entity.payload } });
            const act2 = (): unknown => entity.update({ patch: { effectiveAt: undefined } });

            // Assert
            expect(act).toThrow("EMPTY_UPDATE_PATCH");
            expect(act1).toThrow("NO_CHANGES_DETECTED");
            expect(act2).toThrow("NO_CHANGES_DETECTED");
            expect(entity.revision).toBe(1);
            expect(entity.updatedAt).toBeUndefined();
        });

        it("[case] - rejects a foreign target position", () => {
            // Arrange
            const entity = createHRRequest();

            // Act
            const act = (): unknown =>
                entity.update({ patch: { targetPosition: { organization: { id: "other" } } as Entities.Position } });

            // Assert
            expect(act).toThrow("ORGANIZATION_MISMATCH");
        });
    });

    describe.each(["update", "submit"] as const)("[Behavior] - %s draft guards", (method) => {
        it.each(["status", "execution"])("[case] - rejects invalid %s", (field) => {
            // Arrange
            const entity = createHRRequest();
            if (field === "status") {
                entity.status = HRRequestStatus.SUBMITTED;
            } else {
                entity.executionStatus = HRExecutionStatus.RUNNING;
            }

            // Act
            const invoke = (): void =>
                method === "update"
                    ? entity.update({ patch: { payloadSchemaVersion: 2 } })
                    : entity.submit({ workflowCode: "hire", workflowVersion: 1 });

            // Assert
            expect(invoke).toThrow("INVALID_STATUS");
        });
    });

    describe("[Method] - submit", () => {
        it("[case] - saves workflow and submission timestamps", () => {
            // Arrange
            const entity = createHRRequest();

            // Act
            entity.submit({ workflowCode: "hire", workflowVersion: 3 });

            // Assert
            expect(entity).toMatchObject({ status: HRRequestStatus.SUBMITTED, workflowCode: "hire", workflowVersion: 3 });
            expect(entity.submittedAt).toBeInstanceOf(Date);
            expect(entity.updatedAt).toBe(entity.submittedAt);
        });

        it("[case] - validates relations before submission", () => {
            // Arrange
            const entity = createHRRequest({ employee: stubEmployee({ organization: { id: "other", realm: "realm" } }) });

            // Act
            const act = (): unknown => entity.submit({ workflowCode: "hire", workflowVersion: 1 });

            // Assert
            expect(act).toThrow("ORGANIZATION_MISMATCH");
            expect(entity.status).toBe(HRRequestStatus.DRAFT);
        });
    });

    describe.each([
        ["withdraw", HRRequestStatus.WITHDRAWN],
        ["approve", HRRequestStatus.APPROVED],
        ["reject", HRRequestStatus.REJECTED],
        ["returnForRevision", HRRequestStatus.DRAFT],
    ] as const)("[Method] - %s", (method, expected) => {
        it("[case] - transitions a submitted request", () => {
            // Arrange
            const entity = createHRRequest({ status: HRRequestStatus.SUBMITTED, revision: 3 });

            // Act
            entity[method]();

            // Assert
            expect(entity.status).toBe(expected);
            expect(entity.updatedAt).toBeInstanceOf(Date);
            if (method === "approve") {
                expect(entity.approvedRevision).toBe(3);
                expect(entity.approvedAt).toBe(entity.updatedAt);
            }
        });

        it("[case] - rejects a resolved request", () => {
            // Arrange

            // Act
            const act = (): unknown => createHRRequest({ status: HRRequestStatus.REJECTED })[method]();

            // Assert
            expect(act).toThrow("INVALID_STATUS");
        });
    });

    describe("[Method] - withdraw", () => {
        it("[case] - also withdraws a draft", () => {
            // Arrange
            const entity = createHRRequest();

            // Act
            entity.withdraw();

            // Assert
            expect(entity.status).toBe(HRRequestStatus.WITHDRAWN);
        });
    });

    describe("[Method] - returnForRevision", () => {
        it("[case] - clears approval and workflow data and increment the revision", () => {
            // Arrange
            const entity = createHRRequest({
                status: HRRequestStatus.SUBMITTED,
                workflowCode: "hire",
                workflowVersion: 3,
                submittedAt: new Date(),
                approvedAt: new Date(),
                approvedRevision: 1,
            });

            // Act
            entity.returnForRevision();

            // Assert
            expect(entity.revision).toBe(2);
            expect(entity.workflowCode).toBeUndefined();
            expect(entity.workflowVersion).toBeUndefined();
            expect(entity.submittedAt).toBeUndefined();
            expect(entity.approvedAt).toBeUndefined();
            expect(entity.approvedRevision).toBeUndefined();
        });
    });

    describe.each(["cancel", "scheduleApplication", "markApplied", "markFailed", "canApply", "beginApplication"] as const)(
        "[Behavior] - %s approval guards",
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
            it("[case] - rejects an unapproved request", () => {
                // Arrange

                // Act
                const act = (): unknown => invoke(createHRRequest());

                // Assert
                expect(act).toThrow("INVALID_STATUS");
            });
            it("[case] - rejects an outdated approval", () => {
                // Arrange

                // Act
                const act = (): unknown =>
                    invoke(createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 2 }));

                // Assert
                expect(act).toThrow("STALE_REVISION");
            });
            it("[case] - rejects an incompatible execution state", () => {
                // Arrange
                const executionStatus = method === "cancel" ? HRExecutionStatus.RUNNING : HRExecutionStatus.APPLIED;

                // Act
                const act = (): unknown =>
                    invoke(createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 1, executionStatus }));

                // Assert
                expect(act).toThrow("INVALID_EXECUTION_STATUS");
            });
        },
    );
    describe("[Behavior] - application", () => {
        it("[case] - schedules, runs, fail, retry and apply an approved revision", () => {
            // Arrange
            const entity = createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 1 });
            const effectiveAt = new Date(0);

            // Act
            entity.scheduleApplication({ effectiveAt });
            const result1 = entity.executionStatus;
            const result2 = entity.effectiveAt;
            entity.beginApplication();
            const result3 = entity.executionStatus;
            entity.markFailed({ reason: "retryable" });
            const result4 = entity.executionStatus;
            const result5 = entity.failure;
            entity.beginApplication();
            const result6 = entity.failure;
            const result = { employee: "employee" };
            entity.markApplied({ result });

            // Assert
            expect(result1).toBe(HRExecutionStatus.SCHEDULED);
            expect(result2).toBe(effectiveAt);
            expect(result3).toBe(HRExecutionStatus.RUNNING);
            expect(result4).toBe(HRExecutionStatus.FAILED);
            expect(result5).toBe("retryable");
            expect(result6).toBeUndefined();
            expect(entity.executionStatus).toBe(HRExecutionStatus.APPLIED);
            expect(entity.appliedRevision).toBe(1);
            expect(entity.appliedAt).toBeInstanceOf(Date);
            expect(entity.appliedAt).toBe(entity.updatedAt);
            expect(entity.result).toBe(result);
            expect(entity.failure).toBeUndefined();
        });

        it("[case] - allows application without a schedule or result", () => {
            // Arrange
            const entity = createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 1 });

            // Act
            entity.beginApplication();
            entity.markApplied({});

            // Assert
            expect(entity.result).toBeUndefined();
            expect(entity.executionStatus).toBe(HRExecutionStatus.APPLIED);
        });

        it("[case] - rejects application before the effective time", () => {
            // Arrange
            const entity = createHRRequest({
                status: HRRequestStatus.APPROVED,
                approvedRevision: 1,
                effectiveAt: new Date("2999-01-01T00:00:00Z"),
            });

            // Act
            const act = (): unknown => entity.canApply();
            const act1 = (): unknown => entity.beginApplication();

            // Assert
            expect(act).toThrow("APPLICATION_NOT_DUE");
            expect(act1).toThrow("APPLICATION_NOT_DUE");
            expect(entity.executionStatus).toBe(HRExecutionStatus.NOT_STARTED);
        });
    });

    describe("[Method] - cancel", () => {
        it.each([HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED, HRExecutionStatus.APPLIED])(
            "[case] - cancels execution state %s",
            (executionStatus) => {
                // Arrange
                const entity = createHRRequest({ status: HRRequestStatus.APPROVED, approvedRevision: 1, executionStatus });

                // Act
                entity.cancel();

                // Assert
                expect(entity.status).toBe(HRRequestStatus.CANCELLED);
                expect(entity.executionStatus).toBe(executionStatus);
                expect(entity.updatedAt).toBeInstanceOf(Date);
            },
        );
    });

    describe.each(["update", "canCreate"] as const)("[Behavior] - %s related request guards", (method) => {
        it.each(["self", "organization", "employee"])("[case] - rejects a related request with mismatched %s", (reason) => {
            // Arrange
            const entity = createHRRequest();
            const request = reason === "self" ? entity : stubRequest();
            if (reason === "organization") {
                request.organization = { id: "other", realm: "realm" };
            }
            if (reason === "employee") {
                request.employee = stubEmployee({ id: "other" });
            }

            // Act
            const invoke = (): void => {
                if (method === "update") {
                    entity.update({ patch: { relatedRequest: request } });
                } else {
                    entity.relatedRequest = request;
                    entity.canCreate();
                }
            };

            // Assert
            expect(invoke).toThrow("REQUEST_MISMATCH");
        });

        it("[case] - accepts a matching related request", () => {
            // Arrange
            const entity = createHRRequest();
            const request = stubRequest();

            // Act
            if (method === "update") {
                entity.update({ patch: { relatedRequest: request } });
            } else {
                entity.relatedRequest = request;
                entity.canCreate();
            }

            // Assert
            expect(entity.relatedRequest).toBe(request);
        });
    });

    describe("[Method] - canCreate", () => {
        it("[case] - accepts a draft and a consistently applied or cancelled request", () => {
            // Arrange

            // Act
            const act = (): unknown => createHRRequest().canCreate();

            // Assert
            expect(act).not.toThrow();
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

        it("[case] - rejects stale approval", () => {
            // Arrange

            // Act
            const act = (): unknown => createHRRequest({ status: HRRequestStatus.APPROVED }).canCreate();

            // Assert
            expect(act).toThrow("STALE_REVISION");
        });

        it("[case] - rejects inconsistent execution states and revisions", () => {
            // Arrange

            // Act
            const act = (): unknown => createHRRequest({ executionStatus: HRExecutionStatus.RUNNING }).canCreate();
            const act1 = (): unknown =>
                createHRRequest({
                    status: HRRequestStatus.CANCELLED,
                    executionStatus: HRExecutionStatus.SCHEDULED,
                    approvedRevision: 2,
                }).canCreate();
            const act2 = (): unknown =>
                createHRRequest({
                    status: HRRequestStatus.APPROVED,
                    approvedRevision: 1,
                    appliedRevision: 2,
                    executionStatus: HRExecutionStatus.APPLIED,
                }).canCreate();

            // Assert
            expect(act).toThrow("INVALID_EXECUTION_STATUS");
            expect(act1).toThrow("INVALID_EXECUTION_STATUS");
            expect(act2).toThrow("INVALID_EXECUTION_STATUS");
        });

        it.each(["employee", "initiatorEmployee", "targetPosition"] as const)("[case] - rejects a foreign %s", (field) => {
            // Arrange
            const entity = createHRRequest();
            Object.assign(entity, { [field]: { organization: { id: "other" } } });

            // Act
            const act = (): unknown => entity.canCreate();

            // Assert
            expect(act).toThrow("ORGANIZATION_MISMATCH");
        });
    });
});
