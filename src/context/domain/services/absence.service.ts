import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { HR_REQUEST_REPOSITORY, ABSENCE_REPOSITORY } from "~context/infrastructure/repositories";
import { AbsenceStatus } from "~context/enums";

import { Absence } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class AbsenceService implements Services.Absence.Contract {
    public constructor(
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(ABSENCE_REPOSITORY)
        private readonly absenceRepository: Repositories.Absence.Contract,
    ) {}

    public create(props: Services.Absence.Create.Props): Services.Absence.Create.Result {
        const { transaction, organization, input } = props;

        const entity = new Absence({
            ...input,
            organization,
            status: AbsenceStatus.SCHEDULED,
        });

        entity.canCreate();
        transaction.persist(entity);

        return entity;
    }

    public async advanceStatus(props: Services.Absence.AdvanceStatus.Props): Services.Absence.AdvanceStatus.Result {
        const { transaction, organization, id } = props;
        const entity = await this.absenceRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.advanceStatus({ at: props.at });

        return entity;
    }

    public async cancel(props: Services.Absence.Cancel.Props): Services.Absence.Cancel.Result {
        const { transaction, organization, id } = props;

        const [entity, request] = await Promise.all([
            this.absenceRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                where: { organization, id },
                transaction,
            }),
            this.hrRequestRepository.findUniqueOrThrow({
                where: { id: props.request, organization },
                transaction,
            }),
        ]);

        entity.cancel({ request });

        return entity;
    }
}
