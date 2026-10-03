import { ClassProvider } from "@nestjs/common";

import { WorkCalendarExceptionRepository } from "./work-calendar-exception.repository";
import { HRApprovalDecisionRepository } from "./hr-approval-decision.repository";
import { PositionAssignmentRepository } from "./position-assignment.repository";
import { LeaveLedgerEntryRepository } from "./leave-ledger-entry.repository";
import { HRApprovalStepRepository } from "./hr-approval-step.repository";
import { WorkCalendarRepository } from "./work-calendar.repository";
import { WorkScheduleRepository } from "./work-schedule.repository";
import { LeavePolicyRepository } from "./leave-policy.repository";
import { EmploymentRepository } from "./employment.repository";
import { HRRequestRepository } from "./hr-request.repository";
import { ChangeLogRepository } from "./change-log.repository";
import { AuditLogRepository } from "./audit-log.repository";
import { EmployeeRepository } from "./employee.repository";
import { PositionRepository } from "./position.repository";
import { AbsenceRepository } from "./absence.repository";
import {
    WORK_CALENDAR_EXCEPTION_REPOSITORY,
    HR_APPROVAL_DECISION_REPOSITORY,
    POSITION_ASSIGNMENT_REPOSITORY,
    LEAVE_LEDGER_ENTRY_REPOSITORY,
    HR_APPROVAL_STEP_REPOSITORY,
    WORK_CALENDAR_REPOSITORY,
    WORK_SCHEDULE_REPOSITORY,
    LEAVE_POLICY_REPOSITORY,
    CHANGE_LOG_REPOSITORY,
    EMPLOYMENT_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    AUDIT_LOG_REPOSITORY,
    POSITION_REPOSITORY,
    EMPLOYEE_REPOSITORY,
    ABSENCE_REPOSITORY,
} from "./tokens";

export const REPOSITORIES: ClassProvider[] = [
    {
        provide: WORK_CALENDAR_EXCEPTION_REPOSITORY,
        useClass: WorkCalendarExceptionRepository,
    },
    {
        provide: HR_APPROVAL_DECISION_REPOSITORY,
        useClass: HRApprovalDecisionRepository,
    },
    {
        provide: POSITION_ASSIGNMENT_REPOSITORY,
        useClass: PositionAssignmentRepository,
    },
    {
        provide: LEAVE_LEDGER_ENTRY_REPOSITORY,
        useClass: LeaveLedgerEntryRepository,
    },
    {
        provide: HR_APPROVAL_STEP_REPOSITORY,
        useClass: HRApprovalStepRepository,
    },
    {
        provide: WORK_SCHEDULE_REPOSITORY,
        useClass: WorkScheduleRepository,
    },
    {
        provide: WORK_CALENDAR_REPOSITORY,
        useClass: WorkCalendarRepository,
    },
    {
        provide: LEAVE_POLICY_REPOSITORY,
        useClass: LeavePolicyRepository,
    },
    {
        provide: EMPLOYMENT_REPOSITORY,
        useClass: EmploymentRepository,
    },
    {
        provide: HR_REQUEST_REPOSITORY,
        useClass: HRRequestRepository,
    },
    {
        provide: CHANGE_LOG_REPOSITORY,
        useClass: ChangeLogRepository,
    },
    {
        provide: AUDIT_LOG_REPOSITORY,
        useClass: AuditLogRepository,
    },
    {
        provide: ABSENCE_REPOSITORY,
        useClass: AbsenceRepository,
    },
    {
        provide: EMPLOYEE_REPOSITORY,
        useClass: EmployeeRepository,
    },
    {
        provide: POSITION_REPOSITORY,
        useClass: PositionRepository,
    },
];

export {
    WORK_CALENDAR_EXCEPTION_REPOSITORY,
    HR_APPROVAL_DECISION_REPOSITORY,
    POSITION_ASSIGNMENT_REPOSITORY,
    LEAVE_LEDGER_ENTRY_REPOSITORY,
    HR_APPROVAL_STEP_REPOSITORY,
    WORK_CALENDAR_REPOSITORY,
    WORK_SCHEDULE_REPOSITORY,
    LEAVE_POLICY_REPOSITORY,
    CHANGE_LOG_REPOSITORY,
    EMPLOYMENT_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    AUDIT_LOG_REPOSITORY,
    POSITION_REPOSITORY,
    EMPLOYEE_REPOSITORY,
    ABSENCE_REPOSITORY,
};
