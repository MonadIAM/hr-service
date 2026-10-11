import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.WorkCalendarException {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.WorkCalendarException.Contract;
                repositories: {
                    workCalendarException: globalThis.Repositories.WorkCalendarException.Contract;
                    organization: globalThis.Repositories.Organization.Contract;
                    workCalendar: globalThis.Repositories.WorkCalendar.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
