import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries.LeavePolicy {
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
                policy: string;
                realm: string;
            };

            type Result = Promise<Entities.LeavePolicy>;

            type Signature = (props: Props) => Result;
        }

        namespace FindMany {
            type DefaultProps = {
                filters: Omit<Repositories.Mappers.LeavePolicy.Filters, "organization">;
                sort: Repositories.Mappers.LeavePolicy.Sort;
                mode: QueryMode.DEFAULT;
                view: ResponseViewType;
                pagination: Pagination;
                organization: string;
                realm: string;
            };

            type ManageProps = {
                filters: Repositories.Mappers.LeavePolicy.Filters;
                sort: Repositories.Mappers.LeavePolicy.Sort;
                mode: QueryMode.MANAGE;
                view: ResponseViewType;
                pagination: Pagination;
            };

            type Props = DefaultProps | ManageProps;

            type Result = Promise<[Entities.LeavePolicy[], number]>;

            type Signature = (props: Props) => Result;
        }

        namespace GetLookupList {
            type Props = {
                organization: string;
                pagination: Pagination;
                realm: string;
                term: string;
            };

            type Result = Repositories.LeavePolicy.GetLookupList.Result;

            type Signature = (props: Props) => Result;
        }
    }
}
