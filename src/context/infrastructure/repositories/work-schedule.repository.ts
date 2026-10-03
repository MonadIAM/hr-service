import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";
import { raw } from "@mikro-orm/postgresql";

import { WorkSchedule } from "~context/domain/entities";
import { ExceptionMapper } from "~common/exceptions";
import { BaseRepository } from "~common/mixins";

import { WorkScheduleMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class WorkScheduleRepository
    extends BaseRepository<Entities.WorkSchedule, Repositories.Mappers.WorkSchedule.Types>({
        Mapper: WorkScheduleMapper,
        Entity: WorkSchedule,
    })
    implements Repositories.WorkSchedule.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }

    public async getLookupList(
        props: Repositories.WorkSchedule.GetLookupList.Props,
    ): Repositories.WorkSchedule.GetLookupList.Result {
        try {
            const { organization, pagination } = props;
            const term = props.term.trim();
            const entityManager = this.readManager.fork();
            const builder = entityManager.createQueryBuilder(WorkSchedule, "e");

            builder
                .select(["e.id", "e.code", "e.name", "e.revision"])
                .where({ organization })
                .limit(pagination.elementsPerPage)
                .offset((pagination.currentPage - 1) * pagination.elementsPerPage);

            if (term) {
                builder
                    .andWhere("(e.name % ? or e.code % ?)", [term, term])
                    .orderBy({ [raw("greatest(similarity(e.name, ?), similarity(e.code, ?))", [term, term])]: "DESC" });
            }

            builder.andOrderBy({ "e.createdAt": "ASC" });

            return await builder.getResultAndCount();
        } catch (error) {
            throw ExceptionMapper.fromORM(error, this.resource);
        }
    }
}
