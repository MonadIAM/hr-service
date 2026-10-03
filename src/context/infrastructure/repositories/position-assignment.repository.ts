import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { PositionAssignment } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { PositionAssignmentMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class PositionAssignmentRepository
    extends BaseRepository<Entities.PositionAssignment, Repositories.Mappers.PositionAssignment.Types>({
        Mapper: PositionAssignmentMapper,
        Entity: PositionAssignment,
    })
    implements Repositories.PositionAssignment.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
