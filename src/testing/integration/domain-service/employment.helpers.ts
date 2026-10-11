import { EmploymentService } from "~context/domain/services/employment.service";

export class EmploymentIntegrationHelpers implements Integration.Domain.Employment.Contract {
    public service(_context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Employment.Service.Context {
        const repositories = {};

        return {
            service: new EmploymentService(),
            repositories,
        };
    }
}
