import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { WorkCalendarException } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { WorkCalendarExceptionMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class WorkCalendarExceptionRepository
    extends BaseRepository<Entities.WorkCalendarException, Repositories.Mappers.WorkCalendarException.Types>({
        Mapper: WorkCalendarExceptionMapper,
        Entity: WorkCalendarException,
    })
    implements Repositories.WorkCalendarException.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
