import { WorkCalendarExceptionController } from "./work-calendar-exception.controller";
import { HRApprovalStepController } from "./hr-approval-step.controller";
import { WorkScheduleController } from "./work-schedule.controller";
import { WorkCalendarController } from "./work-calendar.controller";
import { LeavePolicyController } from "./leave-policy.controller";
import { HRRequestController } from "./hr-request.controller";
import { EmployeeController } from "./employee.controller";
import { PositionController } from "./position.controller";

export const HTTP_CONTROLLERS = [
    WorkCalendarExceptionController,
    HRApprovalStepController,
    WorkCalendarController,
    WorkScheduleController,
    LeavePolicyController,
    HRRequestController,
    PositionController,
    EmployeeController,
];
