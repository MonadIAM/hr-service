import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Employment } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { EmploymentMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class EmploymentRepository
    extends BaseRepository<Entities.Employment, Repositories.Mappers.Employment.Types>({
        Mapper: EmploymentMapper,
        Entity: Employment,
    })
    implements Repositories.Employment.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
