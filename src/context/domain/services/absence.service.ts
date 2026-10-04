import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { ORGANIZATION_REPOSITORY, HR_REQUEST_REPOSITORY, ABSENCE_REPOSITORY } from "~context/infrastructure/repositories";
import { AbsenceStatus } from "~context/enums";

import { Absence } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class AbsenceService implements Services.Absence.Contract {
    public constructor(
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(ABSENCE_REPOSITORY)
        private readonly absenceRepository: Repositories.Absence.Contract,
    ) {}

    public async create(props: Services.Absence.Create.Props): Services.Absence.Create.Result {
        const { transaction, input } = props;

        const organizationEntity = await this.organizationRepository.findUniqueOrThrow({
            where: { id: props.organization },
            transaction,
        });

        const absenceEntity = new Absence({
            status: AbsenceStatus.SCHEDULED,
            organization: organizationEntity,
            ...input,
        });

        absenceEntity.canCreate();
        transaction.persist(absenceEntity);

        return absenceEntity;
    }

    public async advanceStatus(props: Services.Absence.AdvanceStatus.Props): Services.Absence.AdvanceStatus.Result {
        const { transaction, organization, id } = props;
        const absenceEntity = await this.absenceRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        absenceEntity.advanceStatus({ at: props.at });

        return absenceEntity;
    }

    public async cancel(props: Services.Absence.Cancel.Props): Services.Absence.Cancel.Result {
        const { transaction, organization, id } = props;

        const [absenceEntity, requestEntity] = await Promise.all([
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

        absenceEntity.cancel({ request: requestEntity });

        return absenceEntity;
    }
}
