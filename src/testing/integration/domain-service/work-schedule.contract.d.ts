import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.WorkSchedule {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.WorkSchedule.Contract;
                repositories: {
                    organization: globalThis.Repositories.Organization.Contract;
                    workSchedule: globalThis.Repositories.WorkSchedule.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
