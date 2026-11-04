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
        const where: ORM.ObjectQuery<Entities.HRRequest> = { id: props.request };

        if (props.mode === QueryMode.DEFAULT) {
            where.organization = { id: props.organization, realm: props.realm };
            if (props.actor) {
                where.employee = { account: props.actor };
            }
            if (props.assigneeAccount) {
                where.approvalSteps = { $some: { assigneeEmployee: { account: props.assigneeAccount } } };
            }
        }

        return this.hrRequestRepository.findUniqueOrThrow({
            options: { populate: this.populate[props.view] },
            where,
        });
    }

    public findMany(props: Queries.HRRequest.FindMany.Props): Queries.HRRequest.FindMany.Result {
        const prefilter: ORM.ObjectQuery<Entities.HRRequest> = {};

        if (props.mode === QueryMode.DEFAULT) {
            prefilter.$and = [{ organization: { id: props.organization, realm: props.realm } }];
            if (props.actor) {
                prefilter.$and.push({ employee: { account: props.actor } });
            }
            if (props.assigneeAccount) {
                prefilter.$and.push({ approvalSteps: { $some: { assigneeEmployee: { account: props.assigneeAccount } } } });
            }
        }

        return this.hrRequestRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
