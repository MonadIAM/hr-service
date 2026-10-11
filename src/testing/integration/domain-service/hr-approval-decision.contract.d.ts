import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.HRApprovalDecision {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.HRApprovalDecision.Contract;
                repositories: {};
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
