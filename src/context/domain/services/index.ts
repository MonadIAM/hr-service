import { ClassProvider } from "@nestjs/common";

import { WorkCalendarExceptionService } from "./work-calendar-exception.service";
import { HRApprovalDecisionService } from "./hr-approval-decision.service";
import { PositionAssignmentService } from "./position-assignment.service";
import { LeaveLedgerEntryService } from "./leave-ledger-entry.service";
import { HRApprovalStepService } from "./hr-approval-step.service";
import { WorkCalendarService } from "./work-calendar.service";
import { WorkScheduleService } from "./work-schedule.service";
import { OrganizationService } from "./organization.service";
import { LeavePolicyService } from "./leave-policy.service";
import { EmploymentService } from "./employment.service";
import { ChangeLogService } from "./change-log.service";
import { HRRequestService } from "./hr-request.service";
import { AuditLogService } from "./audit-log.service";
import { PositionService } from "./position.service";
import { EmployeeService } from "./employee.service";
import { AbsenceService } from "./absence.service";
import {
    WORK_CALENDAR_EXCEPTION_SERVICE,
    HR_APPROVAL_DECISION_SERVICE,
    POSITION_ASSIGNMENT_SERVICE,
    LEAVE_LEDGER_ENTRY_SERVICE,
    HR_APPROVAL_STEP_SERVICE,
    WORK_CALENDAR_SERVICE,
    WORK_SCHEDULE_SERVICE,
    ORGANIZATION_SERVICE,
    LEAVE_POLICY_SERVICE,
    CHANGE_LOG_SERVICE,
    EMPLOYMENT_SERVICE,
    HR_REQUEST_SERVICE,
    AUDIT_LOG_SERVICE,
    POSITION_SERVICE,
    EMPLOYEE_SERVICE,
    ABSENCE_SERVICE,
} from "./tokens";

export const DOMAIN_SERVICES: ClassProvider[] = [
    {
        provide: WORK_CALENDAR_EXCEPTION_SERVICE,
        useClass: WorkCalendarExceptionService,
    },
    {
        provide: HR_APPROVAL_DECISION_SERVICE,
        useClass: HRApprovalDecisionService,
    },
    {
        provide: POSITION_ASSIGNMENT_SERVICE,
        useClass: PositionAssignmentService,
    },
    {
        provide: LEAVE_LEDGER_ENTRY_SERVICE,
        useClass: LeaveLedgerEntryService,
    },
    {
        provide: HR_APPROVAL_STEP_SERVICE,
        useClass: HRApprovalStepService,
    },
    {
        provide: WORK_CALENDAR_SERVICE,
        useClass: WorkCalendarService,
    },
    {
        provide: WORK_SCHEDULE_SERVICE,
        useClass: WorkScheduleService,
    },
    {
        provide: ORGANIZATION_SERVICE,
        useClass: OrganizationService,
    },
    {
        provide: LEAVE_POLICY_SERVICE,
        useClass: LeavePolicyService,
    },
    {
        provide: CHANGE_LOG_SERVICE,
        useClass: ChangeLogService,
    },
    {
        provide: EMPLOYMENT_SERVICE,
        useClass: EmploymentService,
    },
    {
        provide: HR_REQUEST_SERVICE,
        useClass: HRRequestService,
    },
    {
        provide: AUDIT_LOG_SERVICE,
        useClass: AuditLogService,
    },
    {
        provide: POSITION_SERVICE,
        useClass: PositionService,
    },
    {
        provide: EMPLOYEE_SERVICE,
        useClass: EmployeeService,
    },
    {
        provide: ABSENCE_SERVICE,
        useClass: AbsenceService,
    },
];

export {
    WORK_CALENDAR_EXCEPTION_SERVICE,
    HR_APPROVAL_DECISION_SERVICE,
    POSITION_ASSIGNMENT_SERVICE,
    LEAVE_LEDGER_ENTRY_SERVICE,
    HR_APPROVAL_STEP_SERVICE,
    WORK_CALENDAR_SERVICE,
    WORK_SCHEDULE_SERVICE,
    LEAVE_POLICY_SERVICE,
    CHANGE_LOG_SERVICE,
    EMPLOYMENT_SERVICE,
    HR_REQUEST_SERVICE,
    AUDIT_LOG_SERVICE,
    ORGANIZATION_SERVICE,
    POSITION_SERVICE,
    EMPLOYEE_SERVICE,
    ABSENCE_SERVICE,
};
