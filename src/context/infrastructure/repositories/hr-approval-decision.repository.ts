import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { HRApprovalDecision } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { HRApprovalDecisionMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class HRApprovalDecisionRepository
    extends BaseRepository<Entities.HRApprovalDecision, Repositories.Mappers.HRApprovalDecision.Types>({
        Mapper: HRApprovalDecisionMapper,
        Entity: HRApprovalDecision,
    })
    implements Repositories.HRApprovalDecision.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
