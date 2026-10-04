import { Inject, Injectable, Scope } from "@nestjs/common";

import { LEAVE_POLICY_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class LeavePolicyQueries implements Queries.LeavePolicy.Contract {
    public constructor(
        @Inject(LEAVE_POLICY_REPOSITORY)
        private readonly leavePolicyRepository: Repositories.LeavePolicy.QueryContract,
    ) {}

    public findUnique(props: Queries.LeavePolicy.FindUnique.Props): Queries.LeavePolicy.FindUnique.Result {
        return this.leavePolicyRepository.findUniqueOrThrow({
            where: {
                organization: { id: props.organization, realm: props.realm },
                id: props.policy,
            },
        });
    }

    public findMany(props: Queries.LeavePolicy.FindMany.Props): Queries.LeavePolicy.FindMany.Result {
        const prefilter =
            props.mode === QueryMode.DEFAULT ? { organization: { id: props.organization, realm: props.realm } } : {};

        return this.leavePolicyRepository.findMany({
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }

    public getLookupList(props: Queries.LeavePolicy.GetLookupList.Props): Queries.LeavePolicy.GetLookupList.Result {
        return this.leavePolicyRepository.getLookupList({
            organization: props.organization,
            pagination: props.pagination,
            realm: props.realm,
            term: props.term,
        });
    }
}
