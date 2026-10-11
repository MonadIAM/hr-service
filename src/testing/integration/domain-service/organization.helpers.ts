import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { OrganizationService } from "~context/domain/services/organization.service";

export class OrganizationIntegrationHelpers implements Integration.Domain.Organization.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Organization.Service.Context {
        const repositories = {
            organization: new OrganizationRepository(context.readManager),
        };

        return {
            service: new OrganizationService(repositories.organization),
            repositories,
        };
    }
}
