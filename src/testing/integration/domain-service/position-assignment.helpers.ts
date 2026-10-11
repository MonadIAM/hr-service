import { PositionAssignmentRepository } from "~context/infrastructure/repositories/position-assignment.repository";
import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { PositionAssignmentService } from "~context/domain/services/position-assignment.service";
import { HRRequestRepository } from "~context/infrastructure/repositories/hr-request.repository";
import { EmployeeRepository } from "~context/infrastructure/repositories/employee.repository";
import { PositionRepository } from "~context/infrastructure/repositories/position.repository";

export class PositionAssignmentIntegrationHelpers implements Integration.Domain.PositionAssignment.Contract {
    public service(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.PositionAssignment.Service.Context {
        const repositories = {
            positionAssignment: new PositionAssignmentRepository(context.readManager),
            organization: new OrganizationRepository(context.readManager),
            hrRequest: new HRRequestRepository(context.readManager),
            employee: new EmployeeRepository(context.readManager),
            position: new PositionRepository(context.readManager),
        };

        return {
            service: new PositionAssignmentService(
                repositories.positionAssignment,
                repositories.organization,
                repositories.hrRequest,
                repositories.employee,
                repositories.position,
            ),
            repositories,
        };
    }
}
