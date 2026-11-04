import { HRExecutionStatus, HRRequestStatus, HRRequestType } from "~context/enums";

declare global {
    namespace Entities {
        type HRRequest<T extends HRRequestType = HRRequestType> = HRRequest.Contract<T>;

        namespace HRRequest {
            interface Contract<T extends HRRequestType = HRRequestType> {
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
                payload: Payload.ByType[T];
                result?: UnknownObject;
                workflowCode?: string;
                type: T;
                effectiveAt?: Date;
                submittedAt?: Date;
                approvedAt?: Date;
                appliedAt?: Date;
                revision: number;
                failure?: string;

                initiatorEmployee?: Entities.Employee;
                organization: Entities.Organization;
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

            namespace Payload {
                type ByType = {
                    [HRRequestType.LEAVE_ADJUSTMENT]: UnknownObject;
                    [HRRequestType.CANCEL_REQUEST]: UnknownObject;
                    [HRRequestType.CHANGE_TERMS]: ChangeTerms;
                    [HRRequestType.TERMINATE]: Terminate;
                    [HRRequestType.TRANSFER]: UnknownObject;
                    [HRRequestType.OVERTIME]: UnknownObject;
                    [HRRequestType.ABSENCE]: UnknownObject;
                    [HRRequestType.REHIRE]: UnknownObject;
                    [HRRequestType.HIRE]: UnknownObject;
                };

                type ChangeTerms = {
                    scheduleAnchorDate?: string | null;
                    scheduleTimezone?: string;
                    termsValidFrom: string;
                    contractEndsOn?: string | null;
                    contractType?: string | null;
                    workCalendar?: string;
                    workSchedule?: string;
                    leavePolicy?: string;
                };

                type Terminate = {
                    employmentEndedOn: string;
                    reason?: string;
                };
            }

            type MutableFields = Pick<
                Contract,
                "payloadSchemaVersion" | "payload" | "effectiveAt" | "targetPosition" | "relatedRequest"
            >;

            type ConstructorProps<T extends HRRequestType = HRRequestType> = {
                executionStatus: HRExecutionStatus;
                payloadSchemaVersion: number;
                approvedRevision?: number;
                workflowVersion?: number;
                appliedRevision?: number;
                initiatorAccount: string;
                status: HRRequestStatus;
                idempotencyKey: string;
                payload: Payload.ByType[T];
                result?: UnknownObject;
                workflowCode?: string;
                type: T;
                effectiveAt?: Date;
                submittedAt?: Date;
                approvedAt?: Date;
                appliedAt?: Date;
                revision: number;
                failure?: string;

                initiatorEmployee?: Entities.Employee;
                organization: Entities.Organization;
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
