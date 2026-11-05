import { jest } from "@jest/globals";

import { LeavePolicyService } from "~context/domain/services/leave-policy.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class LeavePolicyUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.LeavePolicy.Contract {
    public service(): Unit.Domain.LeavePolicy.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            hrRequest: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.HRRequest>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.HRRequest>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.HRRequest[]>>().mockResolvedValue([]),
            },
            organization: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Organization>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Organization>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Organization[]>>().mockResolvedValue([]),
            },
            leavePolicy: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.LeavePolicy>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.LeavePolicy>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.LeavePolicy[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new LeavePolicyService(
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.LeavePolicy.Contract>(repositories.leavePolicy),
                this.contract<Repositories.HRRequest.Contract>(repositories.hrRequest),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
