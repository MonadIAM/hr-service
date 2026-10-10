import { HRDecisionKind } from "~context/enums";

declare global {
    namespace Entities {
        type HRApprovalDecision = HRApprovalDecision.Contract;

        namespace HRApprovalDecision {
            interface Contract {
                id: string;
                createdAt: Date;

                decision: HRDecisionKind;
                requestRevision: number;
                actorAccount: string;
                comment?: string;
                decidedAt: Date;
                request: string;

                organization: Entities.Organization;
                actorEmployee: Entities.Employee;
                step: Entities.HRApprovalStep;

                canCreate(): void;
            }

            type ConstructorProps = {
                decision: HRDecisionKind;
                requestRevision: number;
                actorAccount: string;
                comment?: string;
                decidedAt: Date;
                request: string;

                organization: Entities.Organization;
                actorEmployee: Entities.Employee;
                step: Entities.HRApprovalStep;
            };
        }
    }
}
