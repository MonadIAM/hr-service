import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { LeavePolicyRepository } from "~context/infrastructure/repositories/leave-policy.repository";
import { LeavePolicyService } from "~context/domain/services/leave-policy.service";

export class LeavePolicyIntegrationHelpers implements Integration.Domain.LeavePolicy.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.LeavePolicy.Service.Context {
        const repositories = {
            organization: new OrganizationRepository(context.readManager),
            leavePolicy: new LeavePolicyRepository(context.readManager),
        };

        return {
            service: new LeavePolicyService(repositories.organization, repositories.leavePolicy),
            repositories,
        };
    }
}
