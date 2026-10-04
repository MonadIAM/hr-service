import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Employment {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
            }

            namespace FindUnique {
                type Props = {
                    view: ResponseViewType;
                    organization: string;
                    employment: string;
                    realm: string;
                };

                type Result = Promise<Entities.Employment>;

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    filters: Omit<Repositories.Mappers.Employment.Filters, "organization">;
                    sort: Repositories.Mappers.Employment.Sort;
                    mode: QueryMode.DEFAULT;
                    view: ResponseViewType;
                    pagination: Pagination;
                    organization: string;
                    realm: string;
                };

                type ManageProps = {
                    filters: Repositories.Mappers.Employment.Filters;
                    sort: Repositories.Mappers.Employment.Sort;
                    mode: QueryMode.MANAGE;
                    view: ResponseViewType;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.Employment[], number]>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
