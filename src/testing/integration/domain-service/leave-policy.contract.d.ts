import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.LeavePolicy {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.LeavePolicy.Contract;
                repositories: {
                    organization: globalThis.Repositories.Organization.Contract;
                    leavePolicy: globalThis.Repositories.LeavePolicy.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
