import { jest } from "@jest/globals";

import { HRRequestService } from "~context/domain/services/hr-request.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class HRRequestUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.HRRequest.Contract {
    public service(): Unit.Domain.HRRequest.Service.Result {
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
            position: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Position>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Position>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Position[]>>().mockResolvedValue([]),
            },
        };
        const services = {
            hrApprovalStep: { create: jest.fn<Services.HRApprovalStep.Create.Signature>() },
        };

        return {
            service: new HRRequestService(
                this.contract<Services.HRApprovalStep.ServiceContract>(services.hrApprovalStep),
                this.contract<Repositories.HRApprovalStep.Contract>(repositories.hrApprovalStep),
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.HRRequest.Contract>(repositories.hrRequest),
                this.contract<Repositories.Employee.Contract>(repositories.employee),
                this.contract<Repositories.Position.Contract>(repositories.position),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
