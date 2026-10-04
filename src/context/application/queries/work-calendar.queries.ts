import { Inject, Injectable, Scope } from "@nestjs/common";

import { WORK_CALENDAR_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class WorkCalendarQueries implements Queries.WorkCalendar.Contract {
    public constructor(
        @Inject(WORK_CALENDAR_REPOSITORY)
        private readonly workCalendarRepository: Repositories.WorkCalendar.QueryContract,
    ) {}

    public findUnique(props: Queries.WorkCalendar.FindUnique.Props): Queries.WorkCalendar.FindUnique.Result {
        return this.workCalendarRepository.findUniqueOrThrow({
            where: {
                organization: { id: props.organization, realm: props.realm },
                id: props.calendar,
            },
        });
    }

    public findMany(props: Queries.WorkCalendar.FindMany.Props): Queries.WorkCalendar.FindMany.Result {
        const prefilter =
            props.mode === QueryMode.DEFAULT ? { organization: { id: props.organization, realm: props.realm } } : {};

        return this.workCalendarRepository.findMany({
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }

    public getLookupList(props: Queries.WorkCalendar.GetLookupList.Props): Queries.WorkCalendar.GetLookupList.Result {
        return this.workCalendarRepository.getLookupList({
            organization: props.organization,
            pagination: props.pagination,
            realm: props.realm,
            term: props.term,
        });
    }
}
