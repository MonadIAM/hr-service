import { jest } from "@jest/globals";

import { LeaveLedgerEntryService } from "~context/domain/services/leave-ledger-entry.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class LeaveLedgerEntryUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.LeaveLedgerEntry.Contract {
    public service(): Unit.Domain.LeaveLedgerEntry.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            leaveLedgerEntry: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.LeaveLedgerEntry>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.LeaveLedgerEntry>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.LeaveLedgerEntry[]>>().mockResolvedValue([]),
            },
            organization: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Organization>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Organization>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Organization[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new LeaveLedgerEntryService(
                this.contract<Repositories.LeaveLedgerEntry.Contract>(repositories.leaveLedgerEntry),
                this.contract<Repositories.Organization.Contract>(repositories.organization),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
