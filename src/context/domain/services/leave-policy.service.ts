import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { LEAVE_POLICY_REPOSITORY } from "~context/infrastructure/repositories";
import { Exception } from "~common/exceptions";
import { RecordStatus } from "~context/enums";

import { LeavePolicy } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class LeavePolicyService implements Services.LeavePolicy.Contract {
    private readonly dictionaryPath = "services.leave-policy";

    public constructor(
        @Inject(LEAVE_POLICY_REPOSITORY)
        private readonly leavePolicyRepository: Repositories.LeavePolicy.Contract,
    ) {}

    public create(props: Services.LeavePolicy.Create.Props): Services.LeavePolicy.Create.Result {
        const { transaction, organization, input } = props;

        const entity = new LeavePolicy({
            ...input,
            status: RecordStatus.ACTIVE,
            organization,
            revision: 1,
        });

        transaction.persist(entity);

        return entity;
    }

    public async createRevision(
        props: Services.LeavePolicy.CreateRevision.Props,
    ): Services.LeavePolicy.CreateRevision.Result {
        const { transaction, organization, input, id } = props;
        const entity = await this.leavePolicyRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        const latest = await this.leavePolicyRepository.find({
            options: {
                orderBy: { revision: "DESC" },
                fields: ["id"],
                limit: 1,
            },
            where: { code: entity.code, organization },
            transaction,
        });

        if (latest[0]?.id !== entity.id) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.STALE_REVISION` });
        }

        const revision = entity.createRevision(input);

        transaction.persist(revision);

        return revision;
    }

    public async archive(props: Services.LeavePolicy.Archive.Props): Services.LeavePolicy.Archive.Result {
        const { transaction, organization, id } = props;
        const entity = await this.leavePolicyRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.archive();

        return entity;
    }

    public async restore(props: Services.LeavePolicy.Restore.Props): Services.LeavePolicy.Restore.Result {
        const { transaction, organization, id } = props;
        const entity = await this.leavePolicyRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.restore();

        return entity;
    }

    public async purge(props: Services.LeavePolicy.Purge.Props): Services.LeavePolicy.Purge.Result {
        const { transaction, organization, id } = props;
        const entity = await this.leavePolicyRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.canPurge();

        transaction.remove(entity);

        return entity;
    }
}
