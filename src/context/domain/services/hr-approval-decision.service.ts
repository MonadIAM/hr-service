import { Injectable, Scope } from "@nestjs/common";

import { HRApprovalDecision } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class HRApprovalDecisionService implements Services.HRApprovalDecision.Contract {
    public create(props: Services.HRApprovalDecision.Create.Props): Services.HRApprovalDecision.Create.Result {
        const { transaction, organization, input } = props;

        const entity = new HRApprovalDecision({
            ...input,
            requestRevision: input.step.requestRevision,
            request: input.step.request.id,
            decidedAt: new Date(),
            organization,
        });

        entity.canCreate();

        transaction.persist(entity);

        return entity;
    }
}
