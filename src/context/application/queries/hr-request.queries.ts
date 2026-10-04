import { Inject, Injectable, Scope } from "@nestjs/common";

import { HR_REQUEST_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class HRRequestQueries implements Queries.HRRequest.Contract {
    private readonly populate = {
        DETAILED: ["initiatorEmployee", "relatedRequest", "targetPosition", "employee"] as const,
        COMPACT: [] as const,
    };

    public constructor(
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.QueryContract,
    ) {}

    public findUnique(props: Queries.HRRequest.FindUnique.Props): Queries.HRRequest.FindUnique.Result {
        return this.hrRequestRepository.findUniqueOrThrow({
            where: { id: props.request, organization: props.organization },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.HRRequest.FindMany.Props): Queries.HRRequest.FindMany.Result {
        const prefilter = props.mode === QueryMode.DEFAULT ? { organization: props.organization } : {};

        return this.hrRequestRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
