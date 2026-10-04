import { Inject, Injectable, Scope } from "@nestjs/common";

import { LEAVE_LEDGER_ENTRY_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class LeaveLedgerEntryQueries implements Queries.LeaveLedgerEntry.Contract {
    private readonly populate = {
        DETAILED: ["reversedByEntry", "reversesEntry", "sourceRequest", "leavePolicy", "employee", "absence"] as const,
        COMPACT: [] as const,
    };

    public constructor(
        @Inject(LEAVE_LEDGER_ENTRY_REPOSITORY)
        private readonly leaveLedgerEntryRepository: Repositories.LeaveLedgerEntry.QueryContract,
    ) {}

    public findUnique(props: Queries.LeaveLedgerEntry.FindUnique.Props): Queries.LeaveLedgerEntry.FindUnique.Result {
        return this.leaveLedgerEntryRepository.findUniqueOrThrow({
            where: { id: props.entry, organization: props.organization },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.LeaveLedgerEntry.FindMany.Props): Queries.LeaveLedgerEntry.FindMany.Result {
        const prefilter = props.mode === QueryMode.DEFAULT ? { organization: props.organization } : {};

        return this.leaveLedgerEntryRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
