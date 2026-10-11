import { jest } from "@jest/globals";

import { AuditLogService } from "~context/domain/services/audit-log.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class AuditLogUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.AuditLog.Contract {
    public service(): Unit.Domain.AuditLog.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            auditLog: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<SystemEntities.AuditLog>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<SystemEntities.AuditLog>>>(),
                find: jest.fn<(props: unknown) => Promise<SystemEntities.AuditLog[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new AuditLogService(this.contract<Repositories.AuditLog.Contract>(repositories.auditLog)),
            repositories,
            transaction,
            services,
        };
    }
}
