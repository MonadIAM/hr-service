import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries.HRApprovalStep {
        interface Contract extends ControllerContract {}

        interface ControllerContract {
            findUnique: FindUnique.Signature;
            findMany: FindMany.Signature;
        }

        namespace FindUnique {
            type DefaultProps = {
                assigneeAccount?: string;
                mode: QueryMode.DEFAULT;
                view: ResponseViewType;
                organization: string;
                realm: string;
                step: string;
            };

            type ManageProps = {
                mode: QueryMode.MANAGE;
                view: ResponseViewType;
                step: string;
            };

            type Props = DefaultProps | ManageProps;

            type Result = Promise<Entities.HRApprovalStep>;

            type Signature = (props: Props) => Result;
        }

        namespace FindMany {
            type DefaultProps = {
                filters: Omit<Repositories.Mappers.HRApprovalStep.Filters, "organization">;
                sort: Repositories.Mappers.HRApprovalStep.Sort;
                assigneeAccount?: string;
                mode: QueryMode.DEFAULT;
                view: ResponseViewType;
                pagination: Pagination;
                organization: string;
                realm: string;
            };

            type ManageProps = {
                filters: Repositories.Mappers.HRApprovalStep.Filters;
                sort: Repositories.Mappers.HRApprovalStep.Sort;
                mode: QueryMode.MANAGE;
                view: ResponseViewType;
                pagination: Pagination;
            };

            type Props = DefaultProps | ManageProps;

            type Result = Promise<[Entities.HRApprovalStep[], number]>;

            type Signature = (props: Props) => Result;
        }
    }
}
