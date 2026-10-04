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
            where: {
                organization: { id: props.organization, realm: props.realm },
                id: props.request,
            },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.HRRequest.FindMany.Props): Queries.HRRequest.FindMany.Result {
        const prefilter =
            props.mode === QueryMode.DEFAULT ? { organization: { id: props.organization, realm: props.realm } } : {};

        return this.hrRequestRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
