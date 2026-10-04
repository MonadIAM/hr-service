import { randomUUID } from "node:crypto";

import { HRApprovalStatus, HRRequestStatus, EmployeeStatus } from "~context/enums";
import { Exception } from "~common/exceptions";

export class HRApprovalStep implements Entities.HRApprovalStep.Contract {
    private static readonly dictionaryPath = "entities.hr-approval-step";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public status: HRApprovalStatus;
    public requestRevision: number;
    public resolvedAt?: Date;
    public ordinal: number;
    public dueAt?: Date;
    public name: string;

    public decision?: Entities.HRApprovalDecision;
    public organization: Entities.Organization;
    public assigneeEmployee: Entities.Employee;
    public request: Entities.HRRequest;

    public constructor(props: Entities.HRApprovalStep.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.status = props.status ?? HRApprovalStatus.WAITING;

        this.requestRevision = props.requestRevision;
        this.resolvedAt = props.resolvedAt;
        this.ordinal = props.ordinal;
        this.dueAt = props.dueAt;
        this.name = props.name;

        this.organization = props.organization;
        this.assigneeEmployee = props.assigneeEmployee;
        this.request = props.request;
    }

    public activate(): void {
        if (this.request.organization.id !== this.organization.id) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.requestRevision !== this.request.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.STALE_REVISION` });
        } else if (this.request.status !== HRRequestStatus.SUBMITTED) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_REQUEST_STATUS` });
        } else if (this.status !== HRApprovalStatus.WAITING) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_STATUS` });
        } else if (this.assigneeEmployee.status === EmployeeStatus.ACTIVE) {
            this.status = HRApprovalStatus.ACTIVE;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INACTIVE_ASSIGNEE` });
        }
    }

    public reassign({ employee }: Entities.HRApprovalStep.Reassign.Props): void {
        if (this.request.organization.id !== this.organization.id) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.requestRevision !== this.request.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.STALE_REVISION` });
        } else if (this.request.status !== HRRequestStatus.SUBMITTED) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_REQUEST_STATUS` });
        } else if (![HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE].includes(this.status)) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_STATUS` });
        } else if (employee.id === this.assigneeEmployee.id) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.NO_CHANGES_DETECTED` });
        } else if (employee.organization.id !== this.organization.id) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (employee.status === EmployeeStatus.ACTIVE) {
            this.assigneeEmployee = employee;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INACTIVE_ASSIGNEE` });
        }
    }

    public approve(): void {
        if (this.request.organization.id !== this.organization.id) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.requestRevision !== this.request.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.STALE_REVISION` });
        } else if (this.request.status !== HRRequestStatus.SUBMITTED) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_REQUEST_STATUS` });
        } else if (this.status !== HRApprovalStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_STATUS` });
        } else if (this.assigneeEmployee.status === EmployeeStatus.ACTIVE) {
            const now = new Date();
            this.status = HRApprovalStatus.APPROVED;
            this.resolvedAt = now;
            this.updatedAt = now;
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INACTIVE_ASSIGNEE` });
        }
    }

    public reject(): void {
        if (this.request.organization.id !== this.organization.id) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.requestRevision !== this.request.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.STALE_REVISION` });
        } else if (this.request.status !== HRRequestStatus.SUBMITTED) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_REQUEST_STATUS` });
        } else if (this.status !== HRApprovalStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_STATUS` });
        } else if (this.assigneeEmployee.status === EmployeeStatus.ACTIVE) {
            const now = new Date();
            this.status = HRApprovalStatus.REJECTED;
            this.resolvedAt = now;
            this.updatedAt = now;
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INACTIVE_ASSIGNEE` });
        }
    }

    public returnForRevision(): void {
        if (this.request.organization.id !== this.organization.id) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.requestRevision !== this.request.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.STALE_REVISION` });
        } else if (this.request.status !== HRRequestStatus.SUBMITTED) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_REQUEST_STATUS` });
        } else if (this.status !== HRApprovalStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_STATUS` });
        } else if (this.assigneeEmployee.status === EmployeeStatus.ACTIVE) {
            const now = new Date();
            this.status = HRApprovalStatus.RETURNED;
            this.resolvedAt = now;
            this.updatedAt = now;
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INACTIVE_ASSIGNEE` });
        }
    }

    public skip(): void {
        if ([HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE].includes(this.status)) {
            const now = new Date();
            this.status = HRApprovalStatus.SKIPPED;
            this.resolvedAt = now;
            this.updatedAt = now;
        } else {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INVALID_STATUS` });
        }
    }

    public canCreate(): void {
        if (
            this.request.organization.id !== this.organization.id ||
            this.assigneeEmployee.organization.id !== this.organization.id
        ) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.requestRevision !== this.request.revision) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.STALE_REVISION` });
        } else if (this.assigneeEmployee.status !== EmployeeStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalStep.dictionaryPath}.INACTIVE_ASSIGNEE` });
        }
    }
}
