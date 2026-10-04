import { Inject, Injectable, Scope } from "@nestjs/common";

import { HR_APPROVAL_DECISION_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class HRApprovalDecisionQueries implements Queries.HRApprovalDecision.Contract {
    private readonly populate = {
        DETAILED: ["actorEmployee", "step"] as const,
        COMPACT: [] as const,
    };

    public constructor(
        @Inject(HR_APPROVAL_DECISION_REPOSITORY)
        private readonly hrApprovalDecisionRepository: Repositories.HRApprovalDecision.QueryContract,
    ) {}

    public findUnique(props: Queries.HRApprovalDecision.FindUnique.Props): Queries.HRApprovalDecision.FindUnique.Result {
        return this.hrApprovalDecisionRepository.findUniqueOrThrow({
            where: {
                organization: { id: props.organization, realm: props.realm },
                id: props.decision,
            },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.HRApprovalDecision.FindMany.Props): Queries.HRApprovalDecision.FindMany.Result {
        const prefilter =
            props.mode === QueryMode.DEFAULT ? { organization: { id: props.organization, realm: props.realm } } : {};

        return this.hrApprovalDecisionRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
