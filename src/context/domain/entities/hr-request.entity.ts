import { Collection } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { HRExecutionStatus, HRRequestStatus, HRRequestType } from "~context/enums";
import { Exception } from "~common/exceptions";

export class HRRequest implements Entities.HRRequest.Contract {
    private static readonly dictionaryPath = "entities.hr-request";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public executionStatus: HRExecutionStatus;
    public payloadSchemaVersion: number;
    public approvedRevision?: number;
    public workflowVersion?: number;
    public appliedRevision?: number;
    public initiatorAccount: string;
    public status: HRRequestStatus;
    public idempotencyKey: string;
    public payload: UnknownObject;
    public result?: UnknownObject;
    public workflowCode?: string;
    public organization: string;
    public type: HRRequestType;
    public effectiveAt?: Date;
    public submittedAt?: Date;
    public approvedAt?: Date;
    public appliedAt?: Date;
    public revision: number;
    public failure?: string;

    public initiatorEmployee?: Entities.Employee;
    public relatedRequest?: Entities.HRRequest;
    public targetPosition?: Entities.Position;
    public employee: Entities.Employee;

    public createdPositionAssignments = new Collection<Entities.PositionAssignment>(this);
    public closedPositionAssignments = new Collection<Entities.PositionAssignment>(this);
    public replacedEmploymentHistory = new Collection<Entities.Employment>(this);
    public leaveLedgerEntries = new Collection<Entities.LeaveLedgerEntry>(this);
    public approvalSteps = new Collection<Entities.HRApprovalStep>(this);
    public relatedRequests = new Collection<Entities.HRRequest>(this);
    public cancelledAbsences = new Collection<Entities.Absence>(this);
    public createdAbsences = new Collection<Entities.Absence>(this);

    public constructor(props: Entities.HRRequest.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.executionStatus = props.executionStatus ?? HRExecutionStatus.NOT_STARTED;
        this.payloadSchemaVersion = props.payloadSchemaVersion ?? 1;
        this.status = props.status ?? HRRequestStatus.DRAFT;
        this.revision = props.revision ?? 1;
        this.payload = props.payload ?? {};

        this.approvedRevision = props.approvedRevision;
        this.initiatorAccount = props.initiatorAccount;
        this.workflowVersion = props.workflowVersion;
        this.appliedRevision = props.appliedRevision;
        this.idempotencyKey = props.idempotencyKey;
        this.organization = props.organization;
        this.workflowCode = props.workflowCode;
        this.effectiveAt = props.effectiveAt;
        this.submittedAt = props.submittedAt;
        this.approvedAt = props.approvedAt;
        this.appliedAt = props.appliedAt;
        this.failure = props.failure;
        this.result = props.result;
        this.type = props.type;

        this.initiatorEmployee = props.initiatorEmployee;
        this.targetPosition = props.targetPosition;
        this.relatedRequest = props.relatedRequest;
        this.employee = props.employee;
    }

    public update({ patch }: Entities.HRRequest.ChangeDataProps): void {
        if (this.status !== HRRequestStatus.DRAFT || this.executionStatus !== HRExecutionStatus.NOT_STARTED) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        } else if (patch.targetPosition && patch.targetPosition.organization !== this.organization) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.hasRelatedRequestMismatch(patch.relatedRequest)) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.REQUEST_MISMATCH` });
        } else {
            const now = new Date();
            let affected = 0;
            for (const [key, value] of Object.typedEntries(patch)) {
                if (typeof value !== "undefined" && value !== this[key]) {
                    (this[key] as unknown) = value;
                    ++affected;
                }
            }

            if (affected) {
                ++this.revision;
                this.updatedAt = now;
            } else if (Object.keys(patch).length) {
                throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.NO_CHANGES_DETECTED` });
            } else {
                throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.EMPTY_UPDATE_PATCH` });
            }
        }
    }

    public submit({ workflowCode, workflowVersion }: Entities.HRRequest.Submit.Props): void {
        if (this.status !== HRRequestStatus.DRAFT || this.executionStatus !== HRExecutionStatus.NOT_STARTED) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        } else {
            this.canCreate();
            const now = new Date();
            this.workflowCode = workflowCode;
            this.workflowVersion = workflowVersion;
            this.status = HRRequestStatus.SUBMITTED;
            this.submittedAt = now;
            this.updatedAt = now;
        }
    }

    public withdraw(): void {
        if ([HRRequestStatus.DRAFT, HRRequestStatus.SUBMITTED].includes(this.status)) {
            this.status = HRRequestStatus.WITHDRAWN;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        }
    }

    public approve(): void {
        if (this.status === HRRequestStatus.SUBMITTED) {
            const now = new Date();
            this.status = HRRequestStatus.APPROVED;
            this.approvedRevision = this.revision;
            this.approvedAt = now;
            this.updatedAt = now;
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        }
    }

    public reject(): void {
        if (this.status === HRRequestStatus.SUBMITTED) {
            this.status = HRRequestStatus.REJECTED;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        }
    }

    public returnForRevision(): void {
        if (this.status === HRRequestStatus.SUBMITTED) {
            this.status = HRRequestStatus.DRAFT;
            ++this.revision;
            this.workflowCode = undefined;
            this.workflowVersion = undefined;
            this.submittedAt = undefined;
            this.approvedAt = undefined;
            this.approvedRevision = undefined;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        }
    }

    public cancel(): void {
        if (this.status !== HRRequestStatus.APPROVED) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        } else if (this.approvedRevision !== this.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.STALE_REVISION` });
        } else if (
            [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED, HRExecutionStatus.APPLIED].includes(
                this.executionStatus,
            )
        ) {
            this.status = HRRequestStatus.CANCELLED;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_EXECUTION_STATUS` });
        }
    }

    public scheduleApplication({ effectiveAt }: Entities.HRRequest.ScheduleApplication.Props): void {
        if (this.status !== HRRequestStatus.APPROVED) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        } else if (this.approvedRevision !== this.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.STALE_REVISION` });
        } else if (this.executionStatus === HRExecutionStatus.NOT_STARTED) {
            this.effectiveAt = effectiveAt;
            this.executionStatus = HRExecutionStatus.SCHEDULED;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_EXECUTION_STATUS` });
        }
    }

    public beginApplication(): void {
        this.canApply();
        this.executionStatus = HRExecutionStatus.RUNNING;
        this.failure = undefined;
        this.updatedAt = new Date();
    }

    public markApplied({ result }: Entities.HRRequest.MarkApplied.Props): void {
        if (this.status !== HRRequestStatus.APPROVED) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        } else if (this.approvedRevision !== this.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.STALE_REVISION` });
        } else if (this.executionStatus === HRExecutionStatus.RUNNING) {
            const now = new Date();
            this.executionStatus = HRExecutionStatus.APPLIED;
            this.appliedRevision = this.revision;
            this.appliedAt = now;
            this.result = result;
            this.failure = undefined;
            this.updatedAt = now;
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_EXECUTION_STATUS` });
        }
    }

    public markFailed({ reason }: Entities.HRRequest.MarkFailed.Props): void {
        if (this.status !== HRRequestStatus.APPROVED) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        } else if (this.approvedRevision !== this.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.STALE_REVISION` });
        } else if (this.executionStatus === HRExecutionStatus.RUNNING) {
            this.executionStatus = HRExecutionStatus.FAILED;
            this.failure = reason;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_EXECUTION_STATUS` });
        }
    }

    public canApply(): void {
        if (this.status !== HRRequestStatus.APPROVED) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_STATUS` });
        } else if (this.approvedRevision !== this.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.STALE_REVISION` });
        } else if (
            ![HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED, HRExecutionStatus.FAILED].includes(
                this.executionStatus,
            )
        ) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_EXECUTION_STATUS` });
        } else if ((this.effectiveAt?.getTime() ?? 0) > Date.now()) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.APPLICATION_NOT_DUE` });
        }
    }

    public canCreate(): void {
        if (this.status === HRRequestStatus.APPROVED && this.approvedRevision !== this.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.STALE_REVISION` });
        } else if (this.hasExecutionStateMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_EXECUTION_STATUS` });
        } else if (this.executionStatus === HRExecutionStatus.APPLIED && this.appliedRevision !== this.approvedRevision) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.INVALID_EXECUTION_STATUS` });
        } else if (this.hasEmployeeOrganizationMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.targetPosition && this.targetPosition.organization !== this.organization) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.hasRelatedRequestMismatch(this.relatedRequest)) {
            throw Exception.invariantViolation({ messageKey: `${HRRequest.dictionaryPath}.REQUEST_MISMATCH` });
        }
    }

    private hasRelatedRequestMismatch(request?: Entities.HRRequest): boolean {
        return (
            !!request &&
            (request.id === this.id ||
                request.organization !== this.organization ||
                request.employee.id !== this.employee.id)
        );
    }

    private hasExecutionStateMismatch(): boolean {
        return (
            this.executionStatus !== HRExecutionStatus.NOT_STARTED &&
            (![HRRequestStatus.APPROVED, HRRequestStatus.CANCELLED].includes(this.status) ||
                this.approvedRevision !== this.revision)
        );
    }

    private hasEmployeeOrganizationMismatch(): boolean {
        return [this.employee, this.initiatorEmployee].some(
            (employee) => employee && employee.organization !== this.organization,
        );
    }
}
