import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { HRRequestRepository } from "~context/infrastructure/repositories/hr-request.repository";
import { AbsenceRepository } from "~context/infrastructure/repositories/absence.repository";
import { AbsenceService } from "~context/domain/services/absence.service";

export class AbsenceIntegrationHelpers implements Integration.Domain.Absence.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Absence.Service.Context {
        const repositories = {
            organization: new OrganizationRepository(context.readManager),
            hrRequest: new HRRequestRepository(context.readManager),
            absence: new AbsenceRepository(context.readManager),
        };

        return {
            service: new AbsenceService(repositories.organization, repositories.hrRequest, repositories.absence),
            repositories,
        };
    }
}
