import { jest } from "@jest/globals";

import { ChangeLogService } from "~context/domain/services/change-log.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class ChangeLogUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.ChangeLog.Contract {
    public service(): Unit.Domain.ChangeLog.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            changeLog: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<SystemEntities.ChangeLog>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<SystemEntities.ChangeLog>>>(),
                find: jest.fn<(props: unknown) => Promise<SystemEntities.ChangeLog[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new ChangeLogService(this.contract<Repositories.ChangeLog.Contract>(repositories.changeLog)),
            repositories,
            transaction,
            services,
        };
    }
}
