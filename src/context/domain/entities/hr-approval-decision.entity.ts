import { randomUUID } from "node:crypto";

import { HRDecisionKind, HRApprovalStatus, EmployeeStatus, HRRequestStatus } from "~context/enums";
import { Exception } from "~common/exceptions";

export class HRApprovalDecision implements Entities.HRApprovalDecision.Contract {
    private static readonly dictionaryPath = "entities.hr-approval-decision";

    public id: string;
    public createdAt: Date;

    public decision: HRDecisionKind;
    public requestRevision: number;
    public organization: string;
    public actorAccount: string;
    public comment?: string;
    public request: string;
    public decidedAt: Date;

    public actorEmployee: Entities.Employee;
    public step: Entities.HRApprovalStep;

    public constructor(props: Entities.HRApprovalDecision.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.decidedAt = props.decidedAt ?? new Date();

        this.requestRevision = props.requestRevision;
        this.actorAccount = props.actorAccount;
        this.organization = props.organization;
        this.decision = props.decision;
        this.comment = props.comment;
        this.request = props.request;

        this.actorEmployee = props.actorEmployee;
        this.step = props.step;
    }

    public canCreate(): void {
        if (this.step.organization !== this.organization || this.actorEmployee.organization !== this.organization) {
            throw Exception.invariantViolation({
                messageKey: `${HRApprovalDecision.dictionaryPath}.ORGANIZATION_MISMATCH`,
            });
        } else if (this.hasRequestRevisionMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalDecision.dictionaryPath}.STALE_REVISION` });
        } else if (this.hasActorMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${HRApprovalDecision.dictionaryPath}.INVALID_ACTOR` });
        } else if (this.step.request.status === HRRequestStatus.SUBMITTED) {
            const resolvedStatus = {
                [HRDecisionKind.APPROVE]: HRApprovalStatus.APPROVED,
                [HRDecisionKind.REJECT]: HRApprovalStatus.REJECTED,
                [HRDecisionKind.RETURN]: HRApprovalStatus.RETURNED,
            }[this.decision];
            if (this.step.status !== HRApprovalStatus.ACTIVE && this.step.status !== resolvedStatus) {
                throw Exception.invariantViolation({ messageKey: `${HRApprovalDecision.dictionaryPath}.INVALID_STATUS` });
            }
        } else {
            throw Exception.invariantViolation({
                messageKey: `${HRApprovalDecision.dictionaryPath}.INVALID_REQUEST_STATUS`,
            });
        }
    }

    private hasRequestRevisionMismatch(): boolean {
        return (
            this.request !== this.step.request.id ||
            this.requestRevision !== this.step.requestRevision ||
            this.requestRevision !== this.step.request.revision
        );
    }

    private hasActorMismatch(): boolean {
        return (
            this.actorEmployee.id !== this.step.assigneeEmployee.id ||
            this.actorAccount !== this.actorEmployee.account ||
            this.actorEmployee.status !== EmployeeStatus.ACTIVE
        );
    }
}
