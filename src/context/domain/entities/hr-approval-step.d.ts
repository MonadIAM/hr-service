import { HRApprovalStatus } from "~context/enums";

declare global {
    namespace Entities {
        type HRApprovalStep = HRApprovalStep.Contract;

        namespace HRApprovalStep {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                status: HRApprovalStatus;
                requestRevision: number;
                organization: string;
                resolvedAt?: Date;
                ordinal: number;
                name: string;
                dueAt?: Date;

                decision?: Entities.HRApprovalDecision;
                assigneeEmployee: Entities.Employee;
                request: Entities.HRRequest;

                reassign(props: Reassign.Props): void;
                returnForRevision(): void;
                canCreate(): void;
                activate(): void;
                approve(): void;
                reject(): void;
                skip(): void;
            }

            type ConstructorProps = {
                status: HRApprovalStatus;
                requestRevision: number;
                organization: string;
                resolvedAt?: Date;
                ordinal: number;
                name: string;
                dueAt?: Date;

                assigneeEmployee: Entities.Employee;
                request: Entities.HRRequest;
            };

            namespace Reassign {
                type Props = {
                    employee: Entities.Employee;
                };
            }
        }
    }
}
