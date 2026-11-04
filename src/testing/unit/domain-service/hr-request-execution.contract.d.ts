import { jest } from "@jest/globals";

declare global {
    namespace Unit.Domain.HRRequestExecution {
        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Result = {
                service: Services.HRRequestExecution.Contract;
                transaction: Unit.Domain.Core.Transaction;
                repositories: {
                    positionAssignment: Unit.Domain.HR.RepositoryMock<Entities.PositionAssignment>;
                    workCalendar: Unit.Domain.HR.RepositoryMock<Entities.WorkCalendar>;
                    workSchedule: Unit.Domain.HR.RepositoryMock<Entities.WorkSchedule>;
                    leavePolicy: Unit.Domain.HR.RepositoryMock<Entities.LeavePolicy>;
                    hrRequest: Unit.Domain.HR.RepositoryMock<Entities.HRRequest>;
                    employee: Unit.Domain.HR.RepositoryMock<Entities.Employee>;
                };
                services: {
                    employee: {
                        changeTerms: jest.Mock<Services.Employee.ChangeTerms.Signature>;
                        terminate: jest.Mock<Services.Employee.Terminate.Signature>;
                    };
                };
            };

            type Signature = () => Result;
        }
    }
}
