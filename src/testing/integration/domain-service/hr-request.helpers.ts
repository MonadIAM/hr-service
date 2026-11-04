import { PositionAssignmentRepository } from "~context/infrastructure/repositories/position-assignment.repository";
import { HRApprovalStepRepository } from "~context/infrastructure/repositories/hr-approval-step.repository";
import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { HRApprovalDecisionService } from "~context/domain/services/hr-approval-decision.service";
import { HRRequestRepository } from "~context/infrastructure/repositories/hr-request.repository";
import { EmployeeRepository } from "~context/infrastructure/repositories/employee.repository";
import { PositionRepository } from "~context/infrastructure/repositories/position.repository";
import { HRApprovalStepService } from "~context/domain/services/hr-approval-step.service";
import { HRRequestService } from "~context/domain/services/hr-request.service";

import { EmployeeIntegrationHelpers } from "./employee.helpers";

export class HRRequestIntegrationHelpers implements Integration.Domain.HRRequest.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.HRRequest.Service.Context {
        const repositories = {
            positionAssignment: new PositionAssignmentRepository(context.readManager),
            hrApprovalStep: new HRApprovalStepRepository(context.readManager),
            organization: new OrganizationRepository(context.readManager),
            hrRequest: new HRRequestRepository(context.readManager),
            employee: new EmployeeRepository(context.readManager),
            position: new PositionRepository(context.readManager),
        };

        return {
            service: new HRRequestService(
                new HRApprovalStepService(
                    new HRApprovalDecisionService(),
                    repositories.hrApprovalStep,
                    repositories.organization,
                    repositories.hrRequest,
                    repositories.employee,
                ),
                new EmployeeIntegrationHelpers().service(context).service,
                repositories.positionAssignment,
                repositories.hrApprovalStep,
                repositories.organization,
                repositories.hrRequest,
                repositories.employee,
                repositories.position,
            ),
            repositories,
        };
    }
}
