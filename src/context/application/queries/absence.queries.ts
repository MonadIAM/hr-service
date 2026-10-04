import { Inject, Injectable, Scope } from "@nestjs/common";

import { ABSENCE_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class AbsenceQueries implements Queries.Absence.Contract {
    private readonly populate = {
        DETAILED: ["cancelledByRequest", "sourceRequest", "leavePolicy", "employee"] as const,
        COMPACT: [] as const,
    };

    public constructor(
        @Inject(ABSENCE_REPOSITORY)
        private readonly absenceRepository: Repositories.Absence.QueryContract,
    ) {}

    public findUnique(props: Queries.Absence.FindUnique.Props): Queries.Absence.FindUnique.Result {
        return this.absenceRepository.findUniqueOrThrow({
            where: { id: props.absence, organization: props.organization },
            options: { populate: this.populate[props.view] },
        });
    }

    public findMany(props: Queries.Absence.FindMany.Props): Queries.Absence.FindMany.Result {
        const prefilter = props.mode === QueryMode.DEFAULT ? { organization: props.organization } : {};

        return this.absenceRepository.findMany({
            options: { populate: this.populate[props.view] },
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
