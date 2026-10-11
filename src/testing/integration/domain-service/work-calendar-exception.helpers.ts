import { WorkCalendarExceptionRepository } from "~context/infrastructure/repositories/work-calendar-exception.repository";
import { WorkCalendarExceptionService } from "~context/domain/services/work-calendar-exception.service";
import { WorkCalendarRepository } from "~context/infrastructure/repositories/work-calendar.repository";
import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";

export class WorkCalendarExceptionIntegrationHelpers implements Integration.Domain.WorkCalendarException.Contract {
    public service(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.WorkCalendarException.Service.Context {
        const repositories = {
            workCalendarException: new WorkCalendarExceptionRepository(context.readManager),
            organization: new OrganizationRepository(context.readManager),
            workCalendar: new WorkCalendarRepository(context.readManager),
        };

        return {
            service: new WorkCalendarExceptionService(
                repositories.workCalendarException,
                repositories.organization,
                repositories.workCalendar,
            ),
            repositories,
        };
    }
}
