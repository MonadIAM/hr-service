import { HRExecutionStatus, HRRequestStatus, HRRequestType, LeaveUnit, PayPeriod } from "~context/enums";

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

                calculateOvertime(props: CalculateOvertime.Props): CalculateOvertime.Result;
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
                    [HRRequestType.LEAVE_ADJUSTMENT]: LeaveAdjustment;
                    [HRRequestType.CANCEL_REQUEST]: CancelRequest;
                    [HRRequestType.CHANGE_TERMS]: ChangeTerms;
                    [HRRequestType.TERMINATE]: Terminate;
                    [HRRequestType.TRANSFER]: Transfer;
                    [HRRequestType.OVERTIME]: Overtime;
                    [HRRequestType.ABSENCE]: Absence;
                    [HRRequestType.REHIRE]: Hire;
                    [HRRequestType.HIRE]: Hire;
                };

                type CancelRequest = {
                    reason: string;
                };

                type Overtime = {
                    startTime: string;
                    endTime: string;
                    date: string;
                };

                type Absence =
                    | { startDate: string; poolCode: string; endDate: string; unit: LeaveUnit.DAY }
                    | { poolCode: string; startsAt: string; endsAt: string; unit: LeaveUnit.MINUTE };

                type LeaveAdjustment = {
                    balanceDelta: string;
                    leavePolicy: string;
                    effectiveOn: string;
                    poolCode: string;
                    reason: string;
                    unit: LeaveUnit;
                };

                type Hire = {
                    employmentStartedOn: string;
                    scheduleAnchorDate?: string;
                    salaryPeriod?: PayPeriod;
                    scheduleTimezone: string;
                    salaryCurrency?: string;
                    contractEndsOn?: string;
                    termsValidFrom: string;
                    contractType?: string;
                    salaryAmount?: string;
                    workCalendar: string;
                    workSchedule: string;
                    leavePolicy: string;
                    position: string;
                    fte: string;
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

                type Transfer = {
                    validFrom: string;
                    position: string;
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

            namespace CalculateOvertime {
                type Props = {
                    assignment: Entities.PositionAssignment;
                };

                type Result = {
                    calculationSnapshot: {
                        standardWeeklyHours: number;
                        overtimeMultiplier: number;
                        salaryCurrency?: string;
                        monthsPerYear: number;
                        salaryPeriod?: PayPeriod;
                        salaryAmount?: string;
                        weeksPerYear: number;
                        fte: string;
                    };
                    estimatedAmount: string | null;
                    hourlyRate: string | null;
                    assignment: string;
                    startTime: string;
                    employee: string;
                    timezone: string;
                    currency: string | null;
                    endTime: string;
                    minutes: number;
                    hours: string;
                    date: string;
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
