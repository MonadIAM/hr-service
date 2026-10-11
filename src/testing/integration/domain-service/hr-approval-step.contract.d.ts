import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.HRApprovalStep {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.HRApprovalStep.Contract;
                repositories: {
                    hrApprovalStep: globalThis.Repositories.HRApprovalStep.Contract;
                    organization: globalThis.Repositories.Organization.Contract;
                    hrRequest: globalThis.Repositories.HRRequest.Contract;
                    employee: globalThis.Repositories.Employee.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
