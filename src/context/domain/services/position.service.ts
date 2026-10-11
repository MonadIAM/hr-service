import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { RecordStatus, PositionAssignmentStatus, PositionReferenceType } from "~context/enums";
import {
    POSITION_ASSIGNMENT_REPOSITORY,
    ORGANIZATION_REPOSITORY,
    POSITION_REPOSITORY,
} from "~context/infrastructure/repositories";

import { Position } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class PositionService implements Services.Position.Contract {
    public constructor(
        @Inject(POSITION_ASSIGNMENT_REPOSITORY)
        private readonly positionAssignmentRepository: Repositories.PositionAssignment.Contract,
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
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            where: { organization, id },
            transaction,
        });

        positionEntity.update({ patch });

        return positionEntity;
    }

    public async archive(props: Services.Position.Archive.Props): Services.Position.Archive.Result {
        const { transaction, organization, id } = props;
        const positionEntity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            where: { organization, id },
            transaction,
        });

        positionEntity.archive();

        const assignmentEntities = await this.positionAssignmentRepository.find({
            where: { position: { id }, organization, status: PositionAssignmentStatus.ACTIVE },
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            transaction,
        });
        const validTo = new Date().toISOString().slice(0, 10);

        for (const assignmentEntity of assignmentEntities) {
            if (assignmentEntity.validFrom > validTo) {
                assignmentEntity.void();
            } else {
                assignmentEntity.close({ validTo });
            }
        }

        return positionEntity;
    }

    public async restore(props: Services.Position.Restore.Props): Services.Position.Restore.Result {
        const { transaction, organization, id } = props;
        const positionEntity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            where: { organization, id },
            transaction,
        });

        positionEntity.restore();

        return positionEntity;
    }

    public async purge(props: Services.Position.Purge.Props): Services.Position.Purge.Result {
        const { transaction, organization, id } = props;
        const positionEntity = await this.positionRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            where: { organization, id },
            transaction,
        });

        positionEntity.canPurge();

        transaction.remove(positionEntity);

        return positionEntity;
    }

    public async completePlacement(
        props: Services.Position.CompletePlacement.Props,
    ): Services.Position.CompletePlacement.Result {
        const { transaction, input, realm, rejected } = props;
        const positionEntity = await this.positionRepository.findUnique({
            where: { id: input.position, organization: { id: input.organization, realm }, process: input.process },
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            transaction,
        });

        if (positionEntity) {
            if (rejected && !positionEntity.previousStatus) {
                transaction.remove(positionEntity);
            } else {
                positionEntity.completePlacement(rejected);
            }
        }
    }

    public async validateReference(
        props: Services.Position.ValidateReference.Props,
    ): Services.Position.ValidateReference.Result {
        const { transaction, input, realm } = props;
        const positionEntity = await this.positionRepository.findUniqueOrThrow({
            where: {
                ...(input.type === PositionReferenceType.TEAM_LEAD ? { team: input.team } : {}),
                organization: { id: input.organization, realm },
                department: input.department,
                status: RecordStatus.ACTIVE,
                id: input.position,
            },
            options: { lockMode: LockMode.PESSIMISTIC_READ, refresh: true },
            transaction,
        });

        positionEntity.assertReady();
    }

    public async purgeDepartment(props: Services.Position.PurgeDepartment.Props): Services.Position.PurgeDepartment.Result {
        const { transaction, input, realm } = props;
        const positionEntities = await this.positionRepository.find({
            where: { organization: { id: input.organization, realm }, department: input.department },
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            transaction,
        });

        transaction.remove(positionEntities);

        return positionEntities;
    }

    public async purgeTeam(props: Services.Position.PurgeTeam.Props): Services.Position.PurgeTeam.Result {
        const { transaction, input, realm } = props;
        const positionEntities = await this.positionRepository.find({
            where: { organization: { id: input.organization, realm }, team: input.team },
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            transaction,
        });

        transaction.remove(positionEntities);

        return positionEntities;
    }
}
