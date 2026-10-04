import { Inject, Injectable, Scope } from "@nestjs/common";

import { HR_APPROVAL_STEP_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class HRApprovalStepQueries implements Queries.HRApprovalStep.Contract {
    private readonly populate = {
        DETAILED: ["assigneeEmployee", "decision", "request"] as const,
        COMPACT: [] as const,
    };

    public constructor(
        @Inject(HR_APPROVAL_STEP_REPOSITORY)
        private readonly hrApprovalStepRepository: Repositories.HRApprovalStep.QueryContract,
    ) {}

    public findUnique(props: Queries.HRApprovalStep.FindUnique.Props): Queries.HRApprovalStep.FindUnique.Result {
        return this.hrApprovalStepRepository.findUniqueOrThrow({
            where: { id: props.step, organization: props.organization },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.HRApprovalStep.FindMany.Props): Queries.HRApprovalStep.FindMany.Result {
        const prefilter = props.mode === QueryMode.DEFAULT ? { organization: props.organization } : {};

        return this.hrApprovalStepRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
