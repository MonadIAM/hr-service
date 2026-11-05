import { PositionAssignmentRepository } from "~context/infrastructure/repositories/position-assignment.repository";
import { WorkCalendarRepository } from "~context/infrastructure/repositories/work-calendar.repository";
import { WorkScheduleRepository } from "~context/infrastructure/repositories/work-schedule.repository";
import { LeavePolicyRepository } from "~context/infrastructure/repositories/leave-policy.repository";
import { HRRequestExecutionService } from "~context/domain/services/hr-request-execution.service";
import { HRRequestRepository } from "~context/infrastructure/repositories/hr-request.repository";
import { PositionRepository } from "~context/infrastructure/repositories/position.repository";
import { EmployeeRepository } from "~context/infrastructure/repositories/employee.repository";

import { EmployeeIntegrationHelpers } from "./employee.helpers";

export class HRRequestExecutionIntegrationHelpers implements Integration.Domain.HRRequestExecution.Contract {
    public service(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.HRRequestExecution.Service.Context {
        const repositories = {
            positionAssignment: new PositionAssignmentRepository(context.readManager),
            workCalendar: new WorkCalendarRepository(context.readManager),
            workSchedule: new WorkScheduleRepository(context.readManager),
            leavePolicy: new LeavePolicyRepository(context.readManager),
            hrRequest: new HRRequestRepository(context.readManager),
            employee: new EmployeeRepository(context.readManager),
            position: new PositionRepository(context.readManager),
        };

        return {
            service: new HRRequestExecutionService(
                new EmployeeIntegrationHelpers().service(context).service,
                repositories.positionAssignment,
                repositories.workCalendar,
                repositories.workSchedule,
                repositories.leavePolicy,
                repositories.hrRequest,
                repositories.employee,
                repositories.position,
            ),
            repositories,
        };
    }
}
