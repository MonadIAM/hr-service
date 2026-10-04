import { Inject, Injectable, Scope } from "@nestjs/common";

import { WORK_CALENDAR_EXCEPTION_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class WorkCalendarExceptionQueries implements Queries.WorkCalendarException.Contract {
    private readonly populate = {
        DETAILED: ["calendar"] as const,
        COMPACT: [] as const,
    };

    public constructor(
        @Inject(WORK_CALENDAR_EXCEPTION_REPOSITORY)
        private readonly workCalendarExceptionRepository: Repositories.WorkCalendarException.QueryContract,
    ) {}

    public findUnique(
        props: Queries.WorkCalendarException.FindUnique.Props,
    ): Queries.WorkCalendarException.FindUnique.Result {
        return this.workCalendarExceptionRepository.findUniqueOrThrow({
            where: { id: props.exception, organization: props.organization },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.WorkCalendarException.FindMany.Props): Queries.WorkCalendarException.FindMany.Result {
        const prefilter = props.mode === QueryMode.DEFAULT ? { organization: props.organization } : {};

        return this.workCalendarExceptionRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
