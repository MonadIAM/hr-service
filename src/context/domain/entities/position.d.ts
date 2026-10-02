import { RecordStatus, PayPeriod } from "~context/enums";

declare global {
    namespace Entities {
        type Position = Position.Contract;

        namespace Position {
            interface Contract {
                id: string;
                version: number;
                createdAt: Date;
                updatedAt?: Date;

                budgetPeriod?: PayPeriod;
                budgetCurrency?: string;
                budgetAmount?: string;
                requirements?: string;
                organization: string;
                description?: string;
                status: RecordStatus;
                department: string;
                plannedFte: string;
                grade?: string;
                title: string;
                team?: string;
                code: string;

                positionAssignments: ORM.Collection<Entities.PositionAssignment>;
                targetedHRRequests: ORM.Collection<Entities.HRRequest>;

                update(props: ChangeDataProps): void;
                archive(): void;
                restore(): void;
                canPurge(): void;
            }

            type MutableFields = Pick<
                Contract,
                | "code"
                | "title"
                | "description"
                | "requirements"
                | "grade"
                | "plannedFte"
                | "budgetAmount"
                | "budgetCurrency"
                | "budgetPeriod"
                | "department"
                | "team"
            >;

            type ConstructorProps = {
                budgetPeriod?: PayPeriod;
                budgetCurrency?: string;
                budgetAmount?: string;
                requirements?: string;
                organization: string;
                description?: string;
                status: RecordStatus;
                department: string;
                plannedFte: string;
                grade?: string;
                title: string;
                team?: string;
                code: string;
            };

            type ChangeDataProps = {
                patch: Partial<MutableFields>;
            };
        }
    }
}
