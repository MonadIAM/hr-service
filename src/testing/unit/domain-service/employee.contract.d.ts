import { jest } from "@jest/globals";

declare global {
    namespace Unit.Domain.Employee {
        interface Contract {
            service: Service.Signature;
        }
        namespace Service {
            type Result = {
                service: Services.Employee.Contract;
                transaction: Unit.Domain.Core.Transaction;
                repositories: {
                    positionAssignment: Unit.Domain.HR.RepositoryMock<Entities.PositionAssignment>;
                    workCalendar: Unit.Domain.HR.RepositoryMock<Entities.WorkCalendar>;
                    workSchedule: Unit.Domain.HR.RepositoryMock<Entities.WorkSchedule>;
                    organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                    leavePolicy: Unit.Domain.HR.RepositoryMock<Entities.LeavePolicy>;
                    hrRequest: Unit.Domain.HR.RepositoryMock<Entities.HRRequest>;
                    employee: Unit.Domain.HR.RepositoryMock<Entities.Employee>;
                };
                services: {
                    employment: { create: jest.Mock<Services.Employment.Create.Signature> };
                };
            };
            type Signature = () => Result;
        }
    }
}
