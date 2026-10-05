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

                previousStatus?: RecordStatus;
                budgetPeriod?: PayPeriod;
                budgetCurrency?: string;
                budgetAmount?: string;
                requirements?: string;
                description?: string;
                status: RecordStatus;
                department: string;
                plannedFte: string;
                process?: string;
                grade?: string;
                title: string;
                team: string;
                code: string;

                organization: Entities.Organization;

                positionAssignments: ORM.Collection<Entities.PositionAssignment>;
                targetedHRRequests: ORM.Collection<Entities.HRRequest>;

                completePlacement(rejected: boolean): void;
                update(props: ChangeDataProps): void;
                assertReady(): void;
                canPurge(): void;
                archive(): void;
                restore(): void;
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
            >;

            type ConstructorProps = {
                budgetPeriod?: PayPeriod;
                budgetCurrency?: string;
                budgetAmount?: string;
                requirements?: string;
                description?: string;
                status: RecordStatus;
                department: string;
                plannedFte: string;
                grade?: string;
                title: string;
                team: string;
                code: string;

                organization: Entities.Organization;
            };

            type ChangeDataProps = {
                patch: Partial<MutableFields>;
            };
        }
    }
}
