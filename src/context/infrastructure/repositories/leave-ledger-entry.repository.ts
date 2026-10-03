import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { LeaveLedgerEntry } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { LeaveLedgerEntryMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class LeaveLedgerEntryRepository
    extends BaseRepository<Entities.LeaveLedgerEntry, Repositories.Mappers.LeaveLedgerEntry.Types>({
        Mapper: LeaveLedgerEntryMapper,
        Entity: LeaveLedgerEntry,
    })
    implements Repositories.LeaveLedgerEntry.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
