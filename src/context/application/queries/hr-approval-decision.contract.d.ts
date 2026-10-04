import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace HRApprovalDecision {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
            }

            namespace FindUnique {
                type Props = {
                    view: ResponseViewType;
                    organization: string;
                    decision: string;
                    realm: string;
                };

                type Result = Promise<Entities.HRApprovalDecision>;

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    filters: Omit<Repositories.Mappers.HRApprovalDecision.Filters, "organization">;
                    sort: Repositories.Mappers.HRApprovalDecision.Sort;
                    mode: QueryMode.DEFAULT;
                    view: ResponseViewType;
                    pagination: Pagination;
                    organization: string;
                    realm: string;
                };

                type ManageProps = {
                    filters: Repositories.Mappers.HRApprovalDecision.Filters;
                    sort: Repositories.Mappers.HRApprovalDecision.Sort;
                    mode: QueryMode.MANAGE;
                    view: ResponseViewType;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.HRApprovalDecision[], number]>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
