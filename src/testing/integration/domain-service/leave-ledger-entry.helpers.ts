import { LeaveLedgerEntryRepository } from "~context/infrastructure/repositories/leave-ledger-entry.repository";
import { OrganizationRepository } from "~context/infrastructure/repositories/organization.repository";
import { LeaveLedgerEntryService } from "~context/domain/services/leave-ledger-entry.service";

export class LeaveLedgerEntryIntegrationHelpers implements Integration.Domain.LeaveLedgerEntry.Contract {
    public service(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.LeaveLedgerEntry.Service.Context {
        const repositories = {
            leaveLedgerEntry: new LeaveLedgerEntryRepository(context.readManager),
            organization: new OrganizationRepository(context.readManager),
        };

        return {
            service: new LeaveLedgerEntryService(repositories.leaveLedgerEntry, repositories.organization),
            repositories,
        };
    }
}
