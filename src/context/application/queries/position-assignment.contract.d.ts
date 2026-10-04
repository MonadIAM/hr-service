import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace PositionAssignment {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
            }

            namespace FindUnique {
                type Props = {
                    view: ResponseViewType;
                    organization: string;
                    assignment: string;
                    realm: string;
                };

                type Result = Promise<Entities.PositionAssignment>;

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    filters: Omit<Repositories.Mappers.PositionAssignment.Filters, "organization">;
                    sort: Repositories.Mappers.PositionAssignment.Sort;
                    mode: QueryMode.DEFAULT;
                    view: ResponseViewType;
                    pagination: Pagination;
                    organization: string;
                    realm: string;
                };

                type ManageProps = {
                    filters: Repositories.Mappers.PositionAssignment.Filters;
                    sort: Repositories.Mappers.PositionAssignment.Sort;
                    mode: QueryMode.MANAGE;
                    view: ResponseViewType;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.PositionAssignment[], number]>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
