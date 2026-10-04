import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { ORGANIZATION_REPOSITORY, POSITION_REPOSITORY } from "~context/infrastructure/repositories";
import { RecordStatus } from "~context/enums";

import { Position } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class PositionService implements Services.Position.Contract {
    public constructor(
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
        @Inject(POSITION_REPOSITORY)
        private readonly positionRepository: Repositories.Position.Contract,
    ) {}

    public async create(props: Services.Position.Create.Props): Services.Position.Create.Result {
        const { transaction, organization, input } = props;

        const organizationEntity = await this.organizationRepository.findUniqueOrThrow({
            where: { id: organization },
            transaction,
        });

        const positionEntity = new Position({
            organization: organizationEntity,
            status: RecordStatus.ACTIVE,
            ...input,
        });

        transaction.persist(positionEntity);

        return positionEntity;
    }

    public async update(props: Services.Position.Update.Props): Services.Position.Update.Result {
        const { transaction, organization, patch, id } = props;
        const positionEntity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        positionEntity.update({ patch });

        return positionEntity;
    }

    public async archive(props: Services.Position.Archive.Props): Services.Position.Archive.Result {
        const { transaction, organization, id } = props;
        const positionEntity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        positionEntity.archive();

        return positionEntity;
    }

    public async restore(props: Services.Position.Restore.Props): Services.Position.Restore.Result {
        const { transaction, organization, id } = props;
        const positionEntity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        positionEntity.restore();

        return positionEntity;
    }

    public async purge(props: Services.Position.Purge.Props): Services.Position.Purge.Result {
        const { transaction, organization, id } = props;
        const positionEntity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        positionEntity.canPurge();

        transaction.remove(positionEntity);

        return positionEntity;
    }
}
