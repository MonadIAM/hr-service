import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";
import { raw } from "@mikro-orm/postgresql";

import { ExceptionMapper } from "~common/exceptions";
import { Position } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { PositionMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class PositionRepository
    extends BaseRepository<Entities.Position, Repositories.Mappers.Position.Types>({
        Mapper: PositionMapper,
        Entity: Position,
    })
    implements Repositories.Position.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }

    public async getLookupList(
        props: Repositories.Position.GetLookupList.Props,
    ): Repositories.Position.GetLookupList.Result {
        try {
            const { organization, pagination } = props;
            const term = props.term.trim();
            const entityManager = this.readManager.fork();
            const builder = entityManager.createQueryBuilder(Position, "e");

            builder
                .select(["e.id", "e.code", "e.title"])
                .where({ organization })
                .limit(pagination.elementsPerPage)
                .offset((pagination.currentPage - 1) * pagination.elementsPerPage);

            if (term) {
                builder
                    .andWhere("(e.title % ? or e.code % ?)", [term, term])
                    .orderBy({ [raw("greatest(similarity(e.title, ?), similarity(e.code, ?))", [term, term])]: "DESC" });
            }

            builder.andOrderBy({ "e.createdAt": "ASC" });

            return await builder.getResultAndCount();
        } catch (error) {
            throw ExceptionMapper.fromORM(error, this.resource);
        }
    }
}
