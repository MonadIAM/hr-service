import { HRFixture } from "~testing/integration/repositories/hr.fixture";

declare global {
    namespace Integration.Domain.HRRequestExecution {
        type Suite = Postgres.Suite.Contract<Service.Context, HRFixture>;

        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Context = {
                service: Services.HRRequestExecution.Contract;
                repositories: {
                    workCalendarException: globalThis.Repositories.WorkCalendarException.Contract;
                    positionAssignment: globalThis.Repositories.PositionAssignment.Contract;
                    leaveLedgerEntry: globalThis.Repositories.LeaveLedgerEntry.Contract;
                    workCalendar: globalThis.Repositories.WorkCalendar.Contract;
                    workSchedule: globalThis.Repositories.WorkSchedule.Contract;
                    leavePolicy: globalThis.Repositories.LeavePolicy.Contract;
                    hrRequest: globalThis.Repositories.HRRequest.Contract;
                    employee: globalThis.Repositories.Employee.Contract;
                    position: globalThis.Repositories.Position.Contract;
                    absence: globalThis.Repositories.Absence.Contract;
                };
            };

            type Signature = (context: Postgres.Suite.FactoryContext) => Context;
        }
    }
}
