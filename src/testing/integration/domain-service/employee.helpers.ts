import { PositionAssignmentRepository } from "~context/infrastructure/repositories/position-assignment.repository";
import { WorkCalendarRepository } from "~context/infrastructure/repositories/work-calendar.repository";
import { WorkScheduleRepository } from "~context/infrastructure/repositories/work-schedule.repository";
import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { LeavePolicyRepository } from "~context/infrastructure/repositories/leave-policy.repository";
import { HRRequestRepository } from "~context/infrastructure/repositories/hr-request.repository";
import { EmployeeRepository } from "~context/infrastructure/repositories/employee.repository";
import { EmploymentService } from "~context/domain/services/employment.service";
import { EmployeeService } from "~context/domain/services/employee.service";

export class EmployeeIntegrationHelpers implements Integration.Domain.Employee.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Employee.Service.Context {
        const repositories = {
            positionAssignment: new PositionAssignmentRepository(context.readManager),
            workCalendar: new WorkCalendarRepository(context.readManager),
            workSchedule: new WorkScheduleRepository(context.readManager),
            organization: new OrganizationRepository(context.readManager),
            leavePolicy: new LeavePolicyRepository(context.readManager),
            hrRequest: new HRRequestRepository(context.readManager),
            employee: new EmployeeRepository(context.readManager),
        };

        return {
            service: new EmployeeService(
                new EmploymentService(),
                repositories.positionAssignment,
                repositories.workCalendar,
                repositories.workSchedule,
                repositories.organization,
                repositories.leavePolicy,
                repositories.hrRequest,
                repositories.employee,
            ),
            repositories,
        };
    }
}
