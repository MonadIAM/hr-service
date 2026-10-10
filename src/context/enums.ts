export * from "@monadiam/shared";

export enum ResponseViewType {
    /* eslint-disable prettier/prettier */
    DETAILED = "DETAILED",
    COMPACT  = "COMPACT",
    /* eslint-enable prettier/prettier */
}

/** @public */
export enum QueryMode {
    /* eslint-disable prettier/prettier */
    DEFAULT = "DEFAULT",
    MANAGE  = "MANAGE",
    /* eslint-enable prettier/prettier */
}

export enum EntityType {
    /* eslint-disable prettier/prettier */
    WORK_CALENDAR_EXCEPTION = "WORK_CALENDAR_EXCEPTION",
    HR_APPROVAL_DECISION    = "HR_APPROVAL_DECISION",
    POSITION_ASSIGNMENT     = "POSITION_ASSIGNMENT",
    LEAVE_LEDGER_ENTRY      = "LEAVE_LEDGER_ENTRY",
    HR_APPROVAL_STEP        = "HR_APPROVAL_STEP",
    WORK_CALENDAR           = "WORK_CALENDAR",
    WORK_SCHEDULE           = "WORK_SCHEDULE",
    LEAVE_POLICY            = "LEAVE_POLICY",
    ORGANIZATION            = "ORGANIZATION",
    EMPLOYMENT              = "EMPLOYMENT",
    HR_REQUEST              = "HR_REQUEST",
    EMPLOYEE                = "EMPLOYEE",
    POSITION                = "POSITION",
    ABSENCE                 = "ABSENCE",
    /* eslint-enable prettier/prettier */
}

export enum ActionType {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
}

export enum CleanupJob {
    /* eslint-disable prettier/prettier */
    CHANGE_LOG = "cleanup-change-log",
    AUDIT_LOG  = "cleanup-audit-log",
    INBOX      = "cleanup-inbox",
    /* eslint-enable prettier/prettier */
}

export enum RecordStatus {
    /* eslint-disable prettier/prettier */
    ARCHIVED = "ARCHIVED",
    ACTIVE   = "ACTIVE",
    /* eslint-enable prettier/prettier */
}

export enum EmployeeStatus {
    /* eslint-disable prettier/prettier */
    TERMINATED = "TERMINATED",
    ARCHIVED   = "ARCHIVED",
    ACTIVE     = "ACTIVE",
    DRAFT      = "DRAFT",
    /* eslint-enable prettier/prettier */
}

export enum PositionAssignmentStatus {
    ACTIVE = "ACTIVE",
    CLOSED = "CLOSED",
    VOIDED = "VOIDED",
}

export enum SchedulePattern {
    WEEKLY = "WEEKLY",
    CYCLIC = "CYCLIC",
}

export enum CalendarApplication {
    /* eslint-disable prettier/prettier */
    APPLY_OVERRIDES = "APPLY_OVERRIDES",
    KEEP_CYCLE      = "KEEP_CYCLE",
    /* eslint-enable prettier/prettier */
}

export enum DayOverride {
    WORKDAY = "WORKDAY",
    DAY_OFF = "DAY_OFF",
}

export enum LeaveUnit {
    /* eslint-disable prettier/prettier */
    MINUTE = "MINUTE",
    DAY    = "DAY",
    /* eslint-enable prettier/prettier */
}

export enum AbsenceStatus {
    /* eslint-disable prettier/prettier */
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED   = "COMPLETED",
    CANCELLED   = "CANCELLED",
    SCHEDULED   = "SCHEDULED",
    /* eslint-enable prettier/prettier */
}

export enum LeaveLedgerKind {
    /* eslint-disable prettier/prettier */
    ADJUSTMENT = "ADJUSTMENT",
    REVERSAL   = "REVERSAL",
    ACCRUAL    = "ACCRUAL",
    RESERVE    = "RESERVE",
    RELEASE    = "RELEASE",
    CONSUME    = "CONSUME",
    /* eslint-enable prettier/prettier */
}

export enum HRRequestType {
    /* eslint-disable prettier/prettier */
    HIRE             = "HIRE",
    REHIRE           = "REHIRE",
    TRANSFER         = "TRANSFER",
    CHANGE_TERMS     = "CHANGE_TERMS",
    TERMINATE        = "TERMINATE",
    ABSENCE          = "ABSENCE",
    OVERTIME         = "OVERTIME",
    CANCEL_REQUEST   = "CANCEL_REQUEST",
    LEAVE_ADJUSTMENT = "LEAVE_ADJUSTMENT",
    /* eslint-enable prettier/prettier */
}

export enum HRRequestStatus {
    /* eslint-disable prettier/prettier */
    DRAFT     = "DRAFT",
    SUBMITTED = "SUBMITTED",
    APPROVED  = "APPROVED",
    REJECTED  = "REJECTED",
    WITHDRAWN = "WITHDRAWN",
    CANCELLED = "CANCELLED",
    /* eslint-enable prettier/prettier */
}

export enum HRExecutionStatus {
    /* eslint-disable prettier/prettier */
    NOT_STARTED = "NOT_STARTED",
    SCHEDULED   = "SCHEDULED",
    RUNNING     = "RUNNING",
    APPLIED     = "APPLIED",
    FAILED      = "FAILED",
    /* eslint-enable prettier/prettier */
}

export enum HRApprovalStatus {
    /* eslint-disable prettier/prettier */
    WAITING  = "WAITING",
    ACTIVE   = "ACTIVE",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    RETURNED = "RETURNED",
    SKIPPED  = "SKIPPED",
    /* eslint-enable prettier/prettier */
}

export enum HRDecisionKind {
    /* eslint-disable prettier/prettier */
    APPROVE = "APPROVE",
    REJECT  = "REJECT",
    RETURN  = "RETURN",
    /* eslint-enable prettier/prettier */
}

export enum PayPeriod {
    /* eslint-disable prettier/prettier */
    MONTH = "MONTH",
    HOUR  = "HOUR",
    YEAR  = "YEAR",
    /* eslint-enable prettier/prettier */
}
