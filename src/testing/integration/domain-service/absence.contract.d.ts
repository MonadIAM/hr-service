import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.Absence {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.Absence.Contract;
                repositories: {
                    organization: globalThis.Repositories.Organization.Contract;
                    hrRequest: globalThis.Repositories.HRRequest.Contract;
                    absence: globalThis.Repositories.Absence.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
