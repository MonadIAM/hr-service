import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries.WorkCalendarException {
        interface Contract extends ControllerContract {}

        interface ControllerContract {
            findUnique: FindUnique.Signature;
            findMany: FindMany.Signature;
        }

        namespace FindUnique {
            type Props = {
                view: ResponseViewType;
                organization: string;
                exception: string;
                realm: string;
            };

            type Result = Promise<Entities.WorkCalendarException>;

            type Signature = (props: Props) => Result;
        }

        namespace FindMany {
            type DefaultProps = {
                filters: Omit<Repositories.Mappers.WorkCalendarException.Filters, "organization">;
                sort: Repositories.Mappers.WorkCalendarException.Sort;
                mode: QueryMode.DEFAULT;
                view: ResponseViewType;
                pagination: Pagination;
                organization: string;
                realm: string;
            };

            type ManageProps = {
                filters: Repositories.Mappers.WorkCalendarException.Filters;
                sort: Repositories.Mappers.WorkCalendarException.Sort;
                mode: QueryMode.MANAGE;
                view: ResponseViewType;
                pagination: Pagination;
            };

            type Props = DefaultProps | ManageProps;

            type Result = Promise<[Entities.WorkCalendarException[], number]>;

            type Signature = (props: Props) => Result;
        }
    }
}
