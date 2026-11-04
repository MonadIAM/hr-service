import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.HRRequest {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.HRRequest.Contract;
                repositories: {
                    hrApprovalStep: globalThis.Repositories.HRApprovalStep.Contract;
                    organization: globalThis.Repositories.Organization.Contract;
                    hrRequest: globalThis.Repositories.HRRequest.Contract;
                    employee: globalThis.Repositories.Employee.Contract;
                    position: globalThis.Repositories.Position.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
