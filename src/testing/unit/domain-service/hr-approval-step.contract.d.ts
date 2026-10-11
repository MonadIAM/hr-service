import { jest } from "@jest/globals";

declare global {
    namespace Unit.Domain.HRApprovalStep {
        interface Contract {
            service: Service.Signature;
        }

        namespace Service {
            type Result = {
                service: Services.HRApprovalStep.Contract;
                transaction: Unit.Domain.Core.Transaction;
                repositories: {
                    hrApprovalStep: Unit.Domain.HR.RepositoryMock<Entities.HRApprovalStep>;
                    organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                    hrRequest: Unit.Domain.HR.RepositoryMock<Entities.HRRequest>;
                    employee: Unit.Domain.HR.RepositoryMock<Entities.Employee>;
                };
                services: {
                    hrApprovalDecision: {
                        create: jest.Mock<Services.HRApprovalDecision.Create.Signature>;
                    };
                };
            };

            type Signature = () => Result;
        }
    }
}
