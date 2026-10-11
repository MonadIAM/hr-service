import { HRApprovalDecisionService } from "~context/domain/services/hr-approval-decision.service";

export class HRApprovalDecisionIntegrationHelpers implements Integration.Domain.HRApprovalDecision.Contract {
    public service(
        _context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.HRApprovalDecision.Service.Context {
        const repositories = {};

        return {
            service: new HRApprovalDecisionService(),
            repositories,
        };
    }
}
