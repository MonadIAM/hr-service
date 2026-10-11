import { jest } from "@jest/globals";

import { AbsenceService } from "~context/domain/services/absence.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class AbsenceUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.Absence.Contract {
    public service(): Unit.Domain.Absence.Service.Result {
        const transaction = this.transaction();
        const repositories = {
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
            absence: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Absence>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Absence>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Absence[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new AbsenceService(
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.HRRequest.Contract>(repositories.hrRequest),
                this.contract<Repositories.Absence.Contract>(repositories.absence),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
