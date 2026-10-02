import { PositionAssignmentStatus, PayPeriod } from "~context/enums";

declare global {
    namespace Entities {
        type PositionAssignment = PositionAssignment.Contract;

        namespace PositionAssignment {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                status: PositionAssignmentStatus;
                placementSnapshot: UnknownObject;
                salaryPeriod?: PayPeriod;
                salaryCurrency?: string;
                positionTitle: string;
                salaryAmount?: string;
                organization: string;
                department: string;
                validFrom: string;
                validTo?: string;
                grade?: string;
                team?: string;
                fte: string;

                closedByRequest?: Entities.HRRequest;
                sourceRequest?: Entities.HRRequest;
                employee: Entities.Employee;
                position: Entities.Position;

                close(props: Close.Props): void;
                canCreate(): void;
                void(): void;
            }

            type ConstructorProps = {
                status: PositionAssignmentStatus;
                placementSnapshot: UnknownObject;
                salaryPeriod?: PayPeriod;
                salaryCurrency?: string;
                positionTitle: string;
                salaryAmount?: string;
                organization: string;
                department: string;
                validFrom: string;
                validTo?: string;
                grade?: string;
                team?: string;
                fte: string;

                closedByRequest?: Entities.HRRequest;
                sourceRequest?: Entities.HRRequest;
                employee: Entities.Employee;
                position: Entities.Position;
            };

            namespace Close {
                type Props = {
                    validTo: string;

                    request?: Entities.HRRequest;
                };
            }
        }
    }
}
