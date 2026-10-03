import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";
import { raw } from "@mikro-orm/postgresql";

import { ExceptionMapper } from "~common/exceptions";
import { Employee } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { EmployeeMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class EmployeeRepository
    extends BaseRepository<Entities.Employee, Repositories.Mappers.Employee.Types>({
        Mapper: EmployeeMapper,
        Entity: Employee,
    })
    implements Repositories.Employee.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }

    public async getLookupList(
        props: Repositories.Employee.GetLookupList.Props,
    ): Repositories.Employee.GetLookupList.Result {
        try {
            const { organization, pagination } = props;
            const term = props.term.trim();
            const fullName = "(e.last_name || ' ' || e.first_name || coalesce(' ' || e.middle_name, ''))";
            const entityManager = this.readManager.fork();
            const builder = entityManager.createQueryBuilder(Employee, "e");

            builder
                .select(["e.id", "e.employeeNumber", "e.lastName", "e.firstName", "e.middleName"])
                .where({ organization })
                .limit(pagination.elementsPerPage)
                .offset((pagination.currentPage - 1) * pagination.elementsPerPage);

            if (term) {
                const relevance = raw(`greatest(similarity(${fullName}, ?), similarity(e.employee_number, ?))`, [
                    term,
                    term,
                ]);

                builder
                    .andWhere(`(${fullName} % ? or e.employee_number % ?)`, [term, term])
                    .orderBy({ [relevance]: "DESC" });
            }

            builder.andOrderBy({ "e.createdAt": "ASC" });

            return await builder.getResultAndCount();
        } catch (error) {
            throw ExceptionMapper.fromORM(error, this.resource);
        }
    }
}
