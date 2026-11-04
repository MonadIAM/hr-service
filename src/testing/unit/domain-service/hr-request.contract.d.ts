import { jest } from "@jest/globals";

declare global {
    namespace Unit.Domain.HRRequest {
        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Result = {
                service: Services.HRRequest.Contract;
                transaction: Unit.Domain.Core.Transaction;
                repositories: {
                    hrApprovalStep: Unit.Domain.HR.RepositoryMock<Entities.HRApprovalStep>;
                    organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                    hrRequest: Unit.Domain.HR.RepositoryMock<Entities.HRRequest>;
                    employee: Unit.Domain.HR.RepositoryMock<Entities.Employee>;
                    position: Unit.Domain.HR.RepositoryMock<Entities.Position>;
                };
                services: {
                    hrApprovalStep: { create: jest.Mock<Services.HRApprovalStep.Create.Signature> };
                };
            };

            type Signature = () => Result;
        }
    }
}
