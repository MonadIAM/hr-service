import { Inject, Injectable, Scope } from "@nestjs/common";

import { POSITION_ASSIGNMENT_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class PositionAssignmentQueries implements Queries.PositionAssignment.Contract {
    private readonly populate = {
        DETAILED: ["closedByRequest", "sourceRequest", "employee", "position"] as const,
        COMPACT: [] as const,
    };

    public constructor(
        @Inject(POSITION_ASSIGNMENT_REPOSITORY)
        private readonly positionAssignmentRepository: Repositories.PositionAssignment.QueryContract,
    ) {}

    public findUnique(props: Queries.PositionAssignment.FindUnique.Props): Queries.PositionAssignment.FindUnique.Result {
        return this.positionAssignmentRepository.findUniqueOrThrow({
            where: {
                organization: { id: props.organization, realm: props.realm },
                id: props.assignment,
            },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.PositionAssignment.FindMany.Props): Queries.PositionAssignment.FindMany.Result {
        const prefilter =
            props.mode === QueryMode.DEFAULT ? { organization: { id: props.organization, realm: props.realm } } : {};

        return this.positionAssignmentRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
