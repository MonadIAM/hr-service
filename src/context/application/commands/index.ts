import { ClassProvider } from "@nestjs/common";

import { WorkCalendarExceptionCommands } from "./work-calendar-exception.commands";
import { HRApprovalStepCommands } from "./hr-approval-step.commands";
import { WorkCalendarCommands } from "./work-calendar.commands";
import { WorkScheduleCommands } from "./work-schedule.commands";
import { LeavePolicyCommands } from "./leave-policy.commands";
import { HRRequestCommands } from "./hr-request.commands";
import { PositionCommands } from "./position.commands";
import { EmployeeCommands } from "./employee.commands";
import {
    WORK_CALENDAR_EXCEPTION_COMMANDS,
    HR_APPROVAL_STEP_COMMANDS,
    WORK_CALENDAR_COMMANDS,
    WORK_SCHEDULE_COMMANDS,
    LEAVE_POLICY_COMMANDS,
    HR_REQUEST_COMMANDS,
    POSITION_COMMANDS,
    EMPLOYEE_COMMANDS,
} from "./tokens";

export const COMMANDS: ClassProvider[] = [
    {
        provide: WORK_CALENDAR_EXCEPTION_COMMANDS,
        useClass: WorkCalendarExceptionCommands,
    },
    {
        provide: HR_APPROVAL_STEP_COMMANDS,
        useClass: HRApprovalStepCommands,
    },
    {
        provide: WORK_CALENDAR_COMMANDS,
        useClass: WorkCalendarCommands,
    },
    {
        provide: WORK_SCHEDULE_COMMANDS,
        useClass: WorkScheduleCommands,
    },
    {
        provide: LEAVE_POLICY_COMMANDS,
        useClass: LeavePolicyCommands,
    },
    {
        provide: HR_REQUEST_COMMANDS,
        useClass: HRRequestCommands,
    },
    {
        provide: POSITION_COMMANDS,
        useClass: PositionCommands,
    },
    {
        provide: EMPLOYEE_COMMANDS,
        useClass: EmployeeCommands,
    },
];

export {
    WORK_CALENDAR_EXCEPTION_COMMANDS,
    HR_APPROVAL_STEP_COMMANDS,
    WORK_CALENDAR_COMMANDS,
    WORK_SCHEDULE_COMMANDS,
    LEAVE_POLICY_COMMANDS,
    HR_REQUEST_COMMANDS,
    POSITION_COMMANDS,
    EMPLOYEE_COMMANDS,
};
