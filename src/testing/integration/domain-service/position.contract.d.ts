import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.Position {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.Position.Contract;
                repositories: {
                    positionAssignment: globalThis.Repositories.PositionAssignment.Contract;
                    organization: globalThis.Repositories.Organization.Contract;
                    position: globalThis.Repositories.Position.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
