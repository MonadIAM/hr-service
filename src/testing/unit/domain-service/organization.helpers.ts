import { jest } from "@jest/globals";

import { OrganizationService } from "~context/domain/services/organization.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class OrganizationUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.Organization.Contract {
    public service(): Unit.Domain.Organization.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            organization: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Organization>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Organization>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Organization[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new OrganizationService(this.contract<Repositories.Organization.Contract>(repositories.organization)),
            repositories,
            transaction,
            services,
        };
    }
}
