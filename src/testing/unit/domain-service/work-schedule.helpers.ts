import { jest } from "@jest/globals";

import { WorkScheduleService } from "~context/domain/services/work-schedule.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class WorkScheduleUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.WorkSchedule.Contract {
    public service(): Unit.Domain.WorkSchedule.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            organization: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Organization>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Organization>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Organization[]>>().mockResolvedValue([]),
            },
            workSchedule: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.WorkSchedule>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.WorkSchedule>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.WorkSchedule[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new WorkScheduleService(
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.WorkSchedule.Contract>(repositories.workSchedule),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
