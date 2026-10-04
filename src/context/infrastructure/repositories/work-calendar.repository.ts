import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";
import { raw } from "@mikro-orm/postgresql";

import { WorkCalendar } from "~context/domain/entities";
import { ExceptionMapper } from "~common/exceptions";
import { BaseRepository } from "~common/mixins";

import { WorkCalendarMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class WorkCalendarRepository
    extends BaseRepository<Entities.WorkCalendar, Repositories.Mappers.WorkCalendar.Types>({
        Mapper: WorkCalendarMapper,
        Entity: WorkCalendar,
    })
    implements Repositories.WorkCalendar.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }

    public async getLookupList(
        props: Repositories.WorkCalendar.GetLookupList.Props,
    ): Repositories.WorkCalendar.GetLookupList.Result {
        try {
            const { organization, pagination, realm } = props;
            const term = props.term.trim();
            const entityManager = this.readManager.fork();
            const builder = entityManager.createQueryBuilder(WorkCalendar, "e");

            builder
                .select(["e.id", "e.code", "e.name"])
                .where({ organization: { id: organization, realm } })
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
