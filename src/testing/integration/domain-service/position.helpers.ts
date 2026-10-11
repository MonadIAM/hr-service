import { PositionAssignmentRepository } from "~context/infrastructure/repositories/position-assignment.repository";
import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { PositionRepository } from "~context/infrastructure/repositories/position.repository";
import { PositionService } from "~context/domain/services/position.service";

export class PositionIntegrationHelpers implements Integration.Domain.Position.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Position.Service.Context {
        const repositories = {
            positionAssignment: new PositionAssignmentRepository(context.readManager),
            organization: new OrganizationRepository(context.readManager),
            position: new PositionRepository(context.readManager),
        };

        return {
            service: new PositionService(repositories.positionAssignment, repositories.organization, repositories.position),
            repositories,
        };
    }
}
