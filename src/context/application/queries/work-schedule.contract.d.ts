import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace WorkSchedule {
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
                    schedule: string;
                    realm: string;
                };

                type Result = Promise<Entities.WorkSchedule>;

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    filters: Omit<Repositories.Mappers.WorkSchedule.Filters, "organization">;
                    sort: Repositories.Mappers.WorkSchedule.Sort;
                    mode: QueryMode.DEFAULT;
                    view: ResponseViewType;
                    pagination: Pagination;
                    organization: string;
                    realm: string;
                };

                type ManageProps = {
                    filters: Repositories.Mappers.WorkSchedule.Filters;
                    sort: Repositories.Mappers.WorkSchedule.Sort;
                    mode: QueryMode.MANAGE;
                    view: ResponseViewType;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.WorkSchedule[], number]>;

                type Signature = (props: Props) => Result;
            }

            namespace GetLookupList {
                type Props = {
                    organization: string;
                    pagination: Pagination;
                    realm: string;
                    term: string;
                };

                type Result = Repositories.WorkSchedule.GetLookupList.Result;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
