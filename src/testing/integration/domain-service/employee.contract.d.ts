import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.Employee {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.Employee.Contract;
                repositories: {
                    positionAssignment: globalThis.Repositories.PositionAssignment.Contract;
                    workCalendar: globalThis.Repositories.WorkCalendar.Contract;
                    workSchedule: globalThis.Repositories.WorkSchedule.Contract;
                    organization: globalThis.Repositories.Organization.Contract;
                    leavePolicy: globalThis.Repositories.LeavePolicy.Contract;
                    hrRequest: globalThis.Repositories.HRRequest.Contract;
                    employee: globalThis.Repositories.Employee.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
