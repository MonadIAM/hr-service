import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.LeaveLedgerEntry {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.LeaveLedgerEntry.Contract;
                repositories: {
                    leaveLedgerEntry: globalThis.Repositories.LeaveLedgerEntry.Contract;
                    organization: globalThis.Repositories.Organization.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
