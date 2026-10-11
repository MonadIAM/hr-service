import { jest } from "@jest/globals";

import { HRApprovalStepService } from "~context/domain/services/hr-approval-step.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class HRApprovalStepUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.HRApprovalStep.Contract {
    public service(): Unit.Domain.HRApprovalStep.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            hrApprovalStep: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.HRApprovalStep>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.HRApprovalStep>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.HRApprovalStep[]>>().mockResolvedValue([]),
            },
            organization: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Organization>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Organization>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Organization[]>>().mockResolvedValue([]),
            },
            hrRequest: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.HRRequest>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.HRRequest>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.HRRequest[]>>().mockResolvedValue([]),
            },
            employee: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Employee>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Employee>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Employee[]>>().mockResolvedValue([]),
            },
        };
        const services = {
            hrApprovalDecision: { create: jest.fn<Services.HRApprovalDecision.Create.Signature>() },
        };

        return {
            service: new HRApprovalStepService(
                this.contract<Services.HRApprovalDecision.ServiceContract>(services.hrApprovalDecision),
                this.contract<Repositories.HRApprovalStep.Contract>(repositories.hrApprovalStep),
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.HRRequest.Contract>(repositories.hrRequest),
                this.contract<Repositories.Employee.Contract>(repositories.employee),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
