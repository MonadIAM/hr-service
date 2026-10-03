import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { POSITION_REPOSITORY } from "~context/infrastructure/repositories";
import { RecordStatus } from "~context/enums";

import { Position } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class PositionService implements Services.Position.Contract {
    public constructor(
        @Inject(POSITION_REPOSITORY)
        private readonly positionRepository: Repositories.Position.Contract,
    ) {}

    public create(props: Services.Position.Create.Props): Services.Position.Create.Result {
        const { transaction, organization, input } = props;

        const entity = new Position({
            ...input,
            status: RecordStatus.ACTIVE,
            organization,
        });

        transaction.persist(entity);

        return entity;
    }

    public async update(props: Services.Position.Update.Props): Services.Position.Update.Result {
        const { transaction, organization, patch, id } = props;
        const entity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.update({ patch });

        return entity;
    }

    public async archive(props: Services.Position.Archive.Props): Services.Position.Archive.Result {
        const { transaction, organization, id } = props;
        const entity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.archive();

        return entity;
    }

    public async restore(props: Services.Position.Restore.Props): Services.Position.Restore.Result {
        const { transaction, organization, id } = props;
        const entity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.restore();

        return entity;
    }

    public async purge(props: Services.Position.Purge.Props): Services.Position.Purge.Result {
        const { transaction, organization, id } = props;
        const entity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.canPurge();

        transaction.remove(entity);

        return entity;
    }
}
