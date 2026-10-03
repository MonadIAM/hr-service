import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { HRApprovalStep } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { HRApprovalStepMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class HRApprovalStepRepository
    extends BaseRepository<Entities.HRApprovalStep, Repositories.Mappers.HRApprovalStep.Types>({
        Mapper: HRApprovalStepMapper,
        Entity: HRApprovalStep,
    })
    implements Repositories.HRApprovalStep.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
