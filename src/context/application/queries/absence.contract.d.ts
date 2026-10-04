import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Absence {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
            }

            namespace FindUnique {
                type Props = {
                    view: ResponseViewType;
                    organization: string;
                    absence: string;
                };

                type Result = Promise<Entities.Absence>;

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    filters: Omit<Repositories.Mappers.Absence.Filters, "organization">;
                    sort: Repositories.Mappers.Absence.Sort;
                    mode: QueryMode.DEFAULT;
                    view: ResponseViewType;
                    pagination: Pagination;
                    organization: string;
                };

                type ManageProps = {
                    filters: Repositories.Mappers.Absence.Filters;
                    sort: Repositories.Mappers.Absence.Sort;
                    mode: QueryMode.MANAGE;
                    view: ResponseViewType;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.Absence[], number]>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
