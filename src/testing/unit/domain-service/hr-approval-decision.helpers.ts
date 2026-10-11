import { HRApprovalDecisionService } from "~context/domain/services/hr-approval-decision.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class HRApprovalDecisionUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.HRApprovalDecision.Contract {
    public service(): Unit.Domain.HRApprovalDecision.Service.Result {
        const transaction = this.transaction();
        const repositories = {};
        const services = {};

        return {
            service: new HRApprovalDecisionService(),
            repositories,
            transaction,
            services,
        };
    }
}
