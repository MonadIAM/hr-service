import { Inject, Injectable, Scope } from "@nestjs/common";

import { WORK_SCHEDULE_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class WorkScheduleQueries implements Queries.WorkSchedule.Contract {
    public constructor(
        @Inject(WORK_SCHEDULE_REPOSITORY)
        private readonly workScheduleRepository: Repositories.WorkSchedule.QueryContract,
    ) {}

    public findUnique(props: Queries.WorkSchedule.FindUnique.Props): Queries.WorkSchedule.FindUnique.Result {
        return this.workScheduleRepository.findUniqueOrThrow({
            where: { id: props.schedule, organization: props.organization },
        });
    }

    public findMany(props: Queries.WorkSchedule.FindMany.Props): Queries.WorkSchedule.FindMany.Result {
        const prefilter = props.mode === QueryMode.DEFAULT ? { organization: props.organization } : {};

        return this.workScheduleRepository.findMany({
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }

    public getLookupList(props: Queries.WorkSchedule.GetLookupList.Props): Queries.WorkSchedule.GetLookupList.Result {
        return this.workScheduleRepository.getLookupList({
            organization: props.organization,
            pagination: props.pagination,
            term: props.term,
        });
    }
}
