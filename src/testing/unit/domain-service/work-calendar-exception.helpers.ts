import { jest } from "@jest/globals";

import { WorkCalendarExceptionService } from "~context/domain/services/work-calendar-exception.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class WorkCalendarExceptionUnitHelpers
    extends HRDomainUnitHelpers
    implements Unit.Domain.WorkCalendarException.Contract
{
    public service(): Unit.Domain.WorkCalendarException.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            workCalendarException: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.WorkCalendarException>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.WorkCalendarException>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.WorkCalendarException[]>>().mockResolvedValue([]),
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
            service: new WorkCalendarExceptionService(
                this.contract<Repositories.WorkCalendarException.Contract>(repositories.workCalendarException),
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.WorkCalendar.Contract>(repositories.workCalendar),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
