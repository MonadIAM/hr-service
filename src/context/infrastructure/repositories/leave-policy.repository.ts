import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";
import { raw } from "@mikro-orm/postgresql";

import { LeavePolicy } from "~context/domain/entities";
import { ExceptionMapper } from "~common/exceptions";
import { BaseRepository } from "~common/mixins";

import { LeavePolicyMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class LeavePolicyRepository
    extends BaseRepository<Entities.LeavePolicy, Repositories.Mappers.LeavePolicy.Types>({
        Mapper: LeavePolicyMapper,
        Entity: LeavePolicy,
    })
    implements Repositories.LeavePolicy.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }

    public async getLookupList(
        props: Repositories.LeavePolicy.GetLookupList.Props,
    ): Repositories.LeavePolicy.GetLookupList.Result {
        try {
            const { organization, pagination } = props;
            const term = props.term.trim();
            const entityManager = this.readManager.fork();
            const builder = entityManager.createQueryBuilder(LeavePolicy, "e");

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
