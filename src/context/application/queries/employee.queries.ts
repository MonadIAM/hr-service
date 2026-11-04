import { Inject, Injectable, Scope } from "@nestjs/common";

import { EMPLOYEE_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class EmployeeQueries implements Queries.Employee.Contract {
    private readonly populate = {
        DETAILED: ["workCalendar", "workSchedule", "hrBpEmployee", "leavePolicy"] as const,
        COMPACT: [] as const,
    };

    public constructor(
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: Repositories.Employee.QueryContract,
    ) {}

    public findUnique(props: Queries.Employee.FindUnique.Props): Queries.Employee.FindUnique.Result {
        const where: ORM.ObjectQuery<Entities.Employee> = { id: props.employee };

        if (props.mode === QueryMode.DEFAULT) {
            where.organization = { id: props.organization, realm: props.realm };
            if (props.actor) {
                where.account = props.actor;
            }
        }

        return this.employeeRepository.findUniqueOrThrow({
            options: { populate: this.populate[props.view] },
            where,
        });
    }

    public findMany(props: Queries.Employee.FindMany.Props): Queries.Employee.FindMany.Result {
        const prefilter: ORM.ObjectQuery<Entities.Employee> = {};

        if (props.mode === QueryMode.DEFAULT) {
            prefilter.$and = [{ organization: { id: props.organization, realm: props.realm } }];
            if (props.actor) {
                prefilter.$and.push({ account: props.actor });
            }
        }

        return this.employeeRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }

    public getLookupList(props: Queries.Employee.GetLookupList.Props): Queries.Employee.GetLookupList.Result {
        return this.employeeRepository.getLookupList({
            organization: props.organization,
            pagination: props.pagination,
            realm: props.realm,
            term: props.term,
        });
    }
}
