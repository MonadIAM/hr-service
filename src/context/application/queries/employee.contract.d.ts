import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Employee {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                getLookupList: GetLookupList.Signature;
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
            }

            namespace FindUnique {
                type Props = {
                    view: ResponseViewType;
                    organization: string;
                    employee: string;
                    realm: string;
                };

                type Result = Promise<Entities.Employee>;

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    filters: Omit<Repositories.Mappers.Employee.Filters, "organization">;
                    sort: Repositories.Mappers.Employee.Sort;
                    mode: QueryMode.DEFAULT;
                    view: ResponseViewType;
                    pagination: Pagination;
                    organization: string;
                    realm: string;
                };

                type ManageProps = {
                    filters: Repositories.Mappers.Employee.Filters;
                    sort: Repositories.Mappers.Employee.Sort;
                    mode: QueryMode.MANAGE;
                    view: ResponseViewType;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.Employee[], number]>;

                type Signature = (props: Props) => Result;
            }

            namespace GetLookupList {
                type Props = {
                    organization: string;
                    pagination: Pagination;
                    realm: string;
                    term: string;
                };

                type Result = Repositories.Employee.GetLookupList.Result;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
