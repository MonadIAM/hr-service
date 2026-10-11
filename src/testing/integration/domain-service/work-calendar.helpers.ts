import { WorkCalendarRepository } from "~context/infrastructure/repositories/work-calendar.repository";
import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { WorkCalendarService } from "~context/domain/services/work-calendar.service";

export class WorkCalendarIntegrationHelpers implements Integration.Domain.WorkCalendar.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.WorkCalendar.Service.Context {
        const repositories = {
            organization: new OrganizationRepository(context.readManager),
            workCalendar: new WorkCalendarRepository(context.readManager),
        };

        return {
            service: new WorkCalendarService(repositories.organization, repositories.workCalendar),
            repositories,
        };
    }
}
