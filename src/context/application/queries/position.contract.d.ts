import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries.Position {
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
                position: string;
                realm: string;
            };

            type Result = Promise<Entities.Position>;

            type Signature = (props: Props) => Result;
        }

        namespace FindMany {
            type DefaultProps = {
                filters: Omit<Repositories.Mappers.Position.Filters, "organization">;
                sort: Repositories.Mappers.Position.Sort;
                mode: QueryMode.DEFAULT;
                view: ResponseViewType;
                pagination: Pagination;
                organization: string;
                realm: string;
            };

            type ManageProps = {
                filters: Repositories.Mappers.Position.Filters;
                sort: Repositories.Mappers.Position.Sort;
                mode: QueryMode.MANAGE;
                view: ResponseViewType;
                pagination: Pagination;
            };

            type Props = DefaultProps | ManageProps;

            type Result = Promise<[Entities.Position[], number]>;

            type Signature = (props: Props) => Result;
        }

        namespace GetLookupList {
            type Props = {
                organization: string;
                pagination: Pagination;
                realm: string;
                term: string;
            };

            type Result = Repositories.Position.GetLookupList.Result;

            type Signature = (props: Props) => Result;
        }
    }
}
