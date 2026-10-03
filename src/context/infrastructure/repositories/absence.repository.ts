import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Absence } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { AbsenceMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class AbsenceRepository
    extends BaseRepository<Entities.Absence, Repositories.Mappers.Absence.Types>({
        Mapper: AbsenceMapper,
        Entity: Absence,
    })
    implements Repositories.Absence.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
