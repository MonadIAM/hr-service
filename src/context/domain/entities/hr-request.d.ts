import { HRExecutionStatus, HRRequestStatus, HRRequestType } from "~context/enums";

declare global {
    namespace Entities {
        type HRRequest = HRRequest.Contract;

        namespace HRRequest {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                executionStatus: HRExecutionStatus;
                payloadSchemaVersion: number;
                approvedRevision?: number;
                workflowVersion?: number;
                appliedRevision?: number;
                initiatorAccount: string;
                status: HRRequestStatus;
                idempotencyKey: string;
                payload: UnknownObject;
                result?: UnknownObject;
                workflowCode?: string;
                organization: string;
                type: HRRequestType;
                effectiveAt?: Date;
                submittedAt?: Date;
                approvedAt?: Date;
                appliedAt?: Date;
                revision: number;
                failure?: string;

                initiatorEmployee?: Entities.Employee;
                relatedRequest?: Entities.HRRequest;
                targetPosition?: Entities.Position;
                employee: Entities.Employee;

                createdPositionAssignments: ORM.Collection<Entities.PositionAssignment>;
                closedPositionAssignments: ORM.Collection<Entities.PositionAssignment>;
                replacedEmploymentHistory: ORM.Collection<Entities.Employment>;
                leaveLedgerEntries: ORM.Collection<Entities.LeaveLedgerEntry>;
                approvalSteps: ORM.Collection<Entities.HRApprovalStep>;
                relatedRequests: ORM.Collection<Entities.HRRequest>;
                cancelledAbsences: ORM.Collection<Entities.Absence>;
                createdAbsences: ORM.Collection<Entities.Absence>;

                scheduleApplication(props: ScheduleApplication.Props): void;
                markApplied(props: MarkApplied.Props): void;
                markFailed(props: MarkFailed.Props): void;
                update(props: ChangeDataProps): void;
                submit(props: Submit.Props): void;
                returnForRevision(): void;
                beginApplication(): void;
                canCreate(): void;
                canApply(): void;
                withdraw(): void;
                approve(): void;
                reject(): void;
                cancel(): void;
            }

            type MutableFields = Pick<
                Contract,
                "payloadSchemaVersion" | "payload" | "effectiveAt" | "targetPosition" | "relatedRequest"
            >;

            type ConstructorProps = {
                executionStatus: HRExecutionStatus;
                payloadSchemaVersion: number;
                approvedRevision?: number;
                workflowVersion?: number;
                appliedRevision?: number;
                initiatorAccount: string;
                status: HRRequestStatus;
                idempotencyKey: string;
                payload: UnknownObject;
                result?: UnknownObject;
                workflowCode?: string;
                organization: string;
                type: HRRequestType;
                effectiveAt?: Date;
                submittedAt?: Date;
                approvedAt?: Date;
                appliedAt?: Date;
                revision: number;
                failure?: string;

                initiatorEmployee?: Entities.Employee;
                relatedRequest?: Entities.HRRequest;
                targetPosition?: Entities.Position;
                employee: Entities.Employee;
            };

            type ChangeDataProps = {
                patch: Partial<MutableFields>;
            };
            namespace Submit {
                type Props = {
                    workflowCode: string;
                    workflowVersion: number;
                };
            }

            namespace ScheduleApplication {
                type Props = {
                    effectiveAt: Date;
                };
            }

            namespace MarkApplied {
                type Props = {
                    result?: UnknownObject;
                };
            }

            namespace MarkFailed {
                type Props = {
                    reason: string;
                };
            }
        }
    }
}
