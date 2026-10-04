import { ClassProvider } from "@nestjs/common";

import { WorkCalendarExceptionQueries } from "./work-calendar-exception.queries";
import { HRApprovalDecisionQueries } from "./hr-approval-decision.queries";
import { PositionAssignmentQueries } from "./position-assignment.queries";
import { LeaveLedgerEntryQueries } from "./leave-ledger-entry.queries";
import { HRApprovalStepQueries } from "./hr-approval-step.queries";
import { WorkCalendarQueries } from "./work-calendar.queries";
import { WorkScheduleQueries } from "./work-schedule.queries";
import { LeavePolicyQueries } from "./leave-policy.queries";
import { EmploymentQueries } from "./employment.queries";
import { HRRequestQueries } from "./hr-request.queries";
import { ChangeLogQueries } from "./change-log.queries";
import { AuditLogQueries } from "./audit-log.queries";
import { PositionQueries } from "./position.queries";
import { EmployeeQueries } from "./employee.queries";
import { AbsenceQueries } from "./absence.queries";
import {
    WORK_CALENDAR_EXCEPTION_QUERIES,
    HR_APPROVAL_DECISION_QUERIES,
    POSITION_ASSIGNMENT_QUERIES,
    LEAVE_LEDGER_ENTRY_QUERIES,
    HR_APPROVAL_STEP_QUERIES,
    WORK_CALENDAR_QUERIES,
    WORK_SCHEDULE_QUERIES,
    LEAVE_POLICY_QUERIES,
    EMPLOYMENT_QUERIES,
    HR_REQUEST_QUERIES,
    CHANGE_LOG_QUERIES,
    AUDIT_LOG_QUERIES,
    POSITION_QUERIES,
    EMPLOYEE_QUERIES,
    ABSENCE_QUERIES,
} from "./tokens";

export const QUERIES: ClassProvider[] = [
    {
        provide: WORK_CALENDAR_EXCEPTION_QUERIES,
        useClass: WorkCalendarExceptionQueries,
    },
    {
        provide: HR_APPROVAL_DECISION_QUERIES,
        useClass: HRApprovalDecisionQueries,
    },
    {
        provide: POSITION_ASSIGNMENT_QUERIES,
        useClass: PositionAssignmentQueries,
    },
    {
        provide: LEAVE_LEDGER_ENTRY_QUERIES,
        useClass: LeaveLedgerEntryQueries,
    },
    {
        provide: HR_APPROVAL_STEP_QUERIES,
        useClass: HRApprovalStepQueries,
    },
    {
        provide: WORK_CALENDAR_QUERIES,
        useClass: WorkCalendarQueries,
    },
    {
        provide: WORK_SCHEDULE_QUERIES,
        useClass: WorkScheduleQueries,
    },
    {
        provide: LEAVE_POLICY_QUERIES,
        useClass: LeavePolicyQueries,
    },
    {
        provide: EMPLOYMENT_QUERIES,
        useClass: EmploymentQueries,
    },
    {
        provide: HR_REQUEST_QUERIES,
        useClass: HRRequestQueries,
    },
    {
        provide: CHANGE_LOG_QUERIES,
        useClass: ChangeLogQueries,
    },
    {
        provide: AUDIT_LOG_QUERIES,
        useClass: AuditLogQueries,
    },
    {
        provide: POSITION_QUERIES,
        useClass: PositionQueries,
    },
    {
        provide: EMPLOYEE_QUERIES,
        useClass: EmployeeQueries,
    },
    {
        provide: ABSENCE_QUERIES,
        useClass: AbsenceQueries,
    },
];

export {
    WORK_CALENDAR_EXCEPTION_QUERIES,
    HR_APPROVAL_DECISION_QUERIES,
    POSITION_ASSIGNMENT_QUERIES,
    LEAVE_LEDGER_ENTRY_QUERIES,
    HR_APPROVAL_STEP_QUERIES,
    WORK_CALENDAR_QUERIES,
    WORK_SCHEDULE_QUERIES,
    LEAVE_POLICY_QUERIES,
    EMPLOYMENT_QUERIES,
    HR_REQUEST_QUERIES,
    CHANGE_LOG_QUERIES,
    AUDIT_LOG_QUERIES,
    POSITION_QUERIES,
    EMPLOYEE_QUERIES,
    ABSENCE_QUERIES,
};
