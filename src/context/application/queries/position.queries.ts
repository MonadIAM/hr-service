import { Inject, Injectable, Scope } from "@nestjs/common";

import { POSITION_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class PositionQueries implements Queries.Position.Contract {
    public constructor(
        @Inject(POSITION_REPOSITORY)
        private readonly positionRepository: Repositories.Position.QueryContract,
    ) {}

    public findUnique(props: Queries.Position.FindUnique.Props): Queries.Position.FindUnique.Result {
        return this.positionRepository.findUniqueOrThrow({
            where: {
                organization: { id: props.organization, realm: props.realm },
                id: props.position,
            },
        });
    }

    public findMany(props: Queries.Position.FindMany.Props): Queries.Position.FindMany.Result {
        const prefilter =
            props.mode === QueryMode.DEFAULT ? { organization: { id: props.organization, realm: props.realm } } : {};

        return this.positionRepository.findMany({
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }

    public getLookupList(props: Queries.Position.GetLookupList.Props): Queries.Position.GetLookupList.Result {
        return this.positionRepository.getLookupList({
            organization: props.organization,
            pagination: props.pagination,
            realm: props.realm,
            term: props.term,
        });
    }
}
