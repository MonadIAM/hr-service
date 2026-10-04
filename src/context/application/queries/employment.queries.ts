import { Inject, Injectable, Scope } from "@nestjs/common";

import { EMPLOYMENT_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class EmploymentQueries implements Queries.Employment.Contract {
    private readonly populate = {
        DETAILED: ["replacedByRequest", "workCalendar", "workSchedule", "leavePolicy", "employee"] as const,
        COMPACT: [] as const,
    };

    public constructor(
        @Inject(EMPLOYMENT_REPOSITORY)
        private readonly employmentRepository: Repositories.Employment.QueryContract,
    ) {}

    public findUnique(props: Queries.Employment.FindUnique.Props): Queries.Employment.FindUnique.Result {
        return this.employmentRepository.findUniqueOrThrow({
            where: { id: props.employment, organization: props.organization },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.Employment.FindMany.Props): Queries.Employment.FindMany.Result {
        const prefilter = props.mode === QueryMode.DEFAULT ? { organization: props.organization } : {};

        return this.employmentRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
