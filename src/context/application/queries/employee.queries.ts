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
        return this.employeeRepository.findUniqueOrThrow({
            where: {
                organization: { id: props.organization, realm: props.realm },
                id: props.employee,
            },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.Employee.FindMany.Props): Queries.Employee.FindMany.Result {
        const prefilter =
            props.mode === QueryMode.DEFAULT ? { organization: { id: props.organization, realm: props.realm } } : {};

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
