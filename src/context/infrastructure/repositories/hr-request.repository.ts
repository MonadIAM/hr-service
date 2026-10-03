import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { HRRequest } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { HRRequestMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class HRRequestRepository
    extends BaseRepository<Entities.HRRequest, Repositories.Mappers.HRRequest.Types>({
        Mapper: HRRequestMapper,
        Entity: HRRequest,
    })
    implements Repositories.HRRequest.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
