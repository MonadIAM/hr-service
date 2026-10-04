import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace HRRequest {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
            }

            namespace FindUnique {
                type Props = {
                    view: ResponseViewType;
                    organization: string;
                    request: string;
                };

                type Result = Promise<Entities.HRRequest>;

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    filters: Omit<Repositories.Mappers.HRRequest.Filters, "organization">;
                    sort: Repositories.Mappers.HRRequest.Sort;
                    mode: QueryMode.DEFAULT;
                    view: ResponseViewType;
                    pagination: Pagination;
                    organization: string;
                };

                type ManageProps = {
                    filters: Repositories.Mappers.HRRequest.Filters;
                    sort: Repositories.Mappers.HRRequest.Sort;
                    mode: QueryMode.MANAGE;
                    view: ResponseViewType;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.HRRequest[], number]>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
