import { HRApprovalStepRepository } from "~context/infrastructure/repositories/hr-approval-step.repository";
import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { HRApprovalDecisionService } from "~context/domain/services/hr-approval-decision.service";
import { HRRequestRepository } from "~context/infrastructure/repositories/hr-request.repository";
import { EmployeeRepository } from "~context/infrastructure/repositories/employee.repository";
import { HRApprovalStepService } from "~context/domain/services/hr-approval-step.service";

export class HRApprovalStepIntegrationHelpers implements Integration.Domain.HRApprovalStep.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.HRApprovalStep.Service.Context {
        const repositories = {
            hrApprovalStep: new HRApprovalStepRepository(context.readManager),
            organization: new OrganizationRepository(context.readManager),
            hrRequest: new HRRequestRepository(context.readManager),
            employee: new EmployeeRepository(context.readManager),
        };

        return {
            service: new HRApprovalStepService(
                new HRApprovalDecisionService(),
                repositories.hrApprovalStep,
                repositories.organization,
                repositories.hrRequest,
                repositories.employee,
            ),
            repositories,
        };
    }
}
