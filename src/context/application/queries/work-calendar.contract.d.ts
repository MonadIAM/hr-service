import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries.WorkCalendar {
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
                calendar: string;
                realm: string;
            };

            type Result = Promise<Entities.WorkCalendar>;

            type Signature = (props: Props) => Result;
        }

        namespace FindMany {
            type DefaultProps = {
                filters: Omit<Repositories.Mappers.WorkCalendar.Filters, "organization">;
                sort: Repositories.Mappers.WorkCalendar.Sort;
                mode: QueryMode.DEFAULT;
                view: ResponseViewType;
                pagination: Pagination;
                organization: string;
                realm: string;
            };

            type ManageProps = {
                filters: Repositories.Mappers.WorkCalendar.Filters;
                sort: Repositories.Mappers.WorkCalendar.Sort;
                mode: QueryMode.MANAGE;
                view: ResponseViewType;
                pagination: Pagination;
            };

            type Props = DefaultProps | ManageProps;

            type Result = Promise<[Entities.WorkCalendar[], number]>;

            type Signature = (props: Props) => Result;
        }

        namespace GetLookupList {
            type Props = {
                organization: string;
                pagination: Pagination;
                realm: string;
                term: string;
            };

            type Result = Repositories.WorkCalendar.GetLookupList.Result;

            type Signature = (props: Props) => Result;
        }
    }
}
