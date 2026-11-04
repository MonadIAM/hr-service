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
        const where: ORM.ObjectQuery<Entities.HRApprovalStep> = { id: props.step };

        if (props.mode === QueryMode.DEFAULT) {
            where.organization = { id: props.organization, realm: props.realm };
            if (props.assigneeAccount) {
                where.assigneeEmployee = { account: props.assigneeAccount };
            }
        }

        return this.hrApprovalStepRepository.findUniqueOrThrow({
            options: { populate: this.populate[props.view] },
            where,
        });
    }

    public findMany(props: Queries.HRApprovalStep.FindMany.Props): Queries.HRApprovalStep.FindMany.Result {
        const prefilter: ORM.ObjectQuery<Entities.HRApprovalStep> = {};

        if (props.mode === QueryMode.DEFAULT) {
            prefilter.$and = [{ organization: { id: props.organization, realm: props.realm } }];
            if (props.assigneeAccount) {
                prefilter.$and.push({ assigneeEmployee: { account: props.assigneeAccount } });
            }
        }

        return this.hrApprovalStepRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
