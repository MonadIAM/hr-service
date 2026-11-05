import { jest } from "@jest/globals";

import { WorkCalendarService } from "~context/domain/services/work-calendar.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class WorkCalendarUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.WorkCalendar.Contract {
    public service(): Unit.Domain.WorkCalendar.Service.Result {
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
            workCalendar: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.WorkCalendar>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.WorkCalendar>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.WorkCalendar[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new WorkCalendarService(
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.WorkCalendar.Contract>(repositories.workCalendar),
                this.contract<Repositories.HRRequest.Contract>(repositories.hrRequest),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
