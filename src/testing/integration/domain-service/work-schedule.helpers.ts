import { WorkScheduleRepository } from "~context/infrastructure/repositories/work-schedule.repository";
import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { HRRequestRepository } from "~context/infrastructure/repositories/hr-request.repository";
import { WorkScheduleService } from "~context/domain/services/work-schedule.service";

export class WorkScheduleIntegrationHelpers implements Integration.Domain.WorkSchedule.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.WorkSchedule.Service.Context {
        const repositories = {
            organization: new OrganizationRepository(context.readManager),
            workSchedule: new WorkScheduleRepository(context.readManager),
            hrRequest: new HRRequestRepository(context.readManager),
        };

        return {
            service: new WorkScheduleService(repositories.organization, repositories.workSchedule, repositories.hrRequest),
            repositories,
        };
    }
}
