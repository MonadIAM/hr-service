import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { LEAVE_POLICY_REPOSITORY, ORGANIZATION_REPOSITORY } from "~context/infrastructure/repositories";
import { Exception } from "~common/exceptions";
import { RecordStatus } from "~context/enums";

import { LeavePolicy } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class LeavePolicyService implements Services.LeavePolicy.Contract {
    private readonly dictionaryPath = "services.leave-policy";

    public constructor(
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
        @Inject(LEAVE_POLICY_REPOSITORY)
        private readonly leavePolicyRepository: Repositories.LeavePolicy.Contract,
    ) {}

    public async create(props: Services.LeavePolicy.Create.Props): Services.LeavePolicy.Create.Result {
        const { transaction, organization, input } = props;

        const organizationEntity = await this.organizationRepository.findUniqueOrThrow({
            where: { id: organization },
            transaction,
        });

        const policyEntity = new LeavePolicy({
            organization: organizationEntity,
            status: RecordStatus.ACTIVE,
            revision: 1,
            ...input,
        });

        transaction.persist(policyEntity);

        return policyEntity;
    }

    public async createRevision(
        props: Services.LeavePolicy.CreateRevision.Props,
    ): Services.LeavePolicy.CreateRevision.Result {
        const { transaction, organization, input, id } = props;
        const policyEntity = await this.leavePolicyRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        const latestRevisionEntities = await this.leavePolicyRepository.find({
            options: {
                orderBy: { revision: "DESC" },
                fields: ["id"],
                limit: 1,
            },
            where: { code: policyEntity.code, organization },
            transaction,
        });

        if (latestRevisionEntities[0]?.id !== policyEntity.id) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.STALE_REVISION` });
        }

        const revisionEntity = policyEntity.createRevision(input);

        transaction.persist(revisionEntity);

        return revisionEntity;
    }

    public async archive(props: Services.LeavePolicy.Archive.Props): Services.LeavePolicy.Archive.Result {
        const { transaction, organization, id } = props;
        const policyEntity = await this.leavePolicyRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        policyEntity.archive();

        return policyEntity;
    }

    public async restore(props: Services.LeavePolicy.Restore.Props): Services.LeavePolicy.Restore.Result {
        const { transaction, organization, id } = props;
        const policyEntity = await this.leavePolicyRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        policyEntity.restore();

        return policyEntity;
    }

    public async purge(props: Services.LeavePolicy.Purge.Props): Services.LeavePolicy.Purge.Result {
        const { transaction, organization, id } = props;
        const policyEntity = await this.leavePolicyRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        policyEntity.canPurge();

        transaction.remove(policyEntity);

        return policyEntity;
    }
}
