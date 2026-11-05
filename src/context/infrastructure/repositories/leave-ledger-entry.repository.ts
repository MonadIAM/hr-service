import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";
import { raw } from "@mikro-orm/postgresql";

import { LeaveLedgerEntry } from "~context/domain/entities";
import { ExceptionMapper } from "~common/exceptions";
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

    public async getBalances(
        props: Repositories.LeaveLedgerEntry.GetBalances.Props,
    ): Repositories.LeaveLedgerEntry.GetBalances.Result {
        try {
            return await props.transaction
                .createQueryBuilder(LeaveLedgerEntry, "entry")
                .select(
                    raw(
                        'entry.employee_id as employee, entry.pool_code as "poolCode", entry.unit, sum(entry.balance_delta - entry.reserved_delta)::text as available',
                    ),
                )
                .leftJoin("entry.employee", "employee")
                .where({ employee: { id: { $in: props.employees } } })
                .andWhere("entry.effective_on <= (?::timestamptz at time zone employee.schedule_timezone)::date", [
                    props.at,
                ])
                .groupBy(raw("entry.employee_id, entry.pool_code, entry.unit"))
                .execute("all", false);
        } catch (error) {
            throw ExceptionMapper.fromORM(error, this.resource);
        }
    }
}
