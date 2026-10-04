import { ResponseViewType, QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace LeaveLedgerEntry {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
            }

            namespace FindUnique {
                type Props = {
                    view: ResponseViewType;
                    organization: string;
                    entry: string;
                    realm: string;
                };

                type Result = Promise<Entities.LeaveLedgerEntry>;

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    filters: Omit<Repositories.Mappers.LeaveLedgerEntry.Filters, "organization">;
                    sort: Repositories.Mappers.LeaveLedgerEntry.Sort;
                    mode: QueryMode.DEFAULT;
                    view: ResponseViewType;
                    pagination: Pagination;
                    organization: string;
                    realm: string;
                };

                type ManageProps = {
                    filters: Repositories.Mappers.LeaveLedgerEntry.Filters;
                    sort: Repositories.Mappers.LeaveLedgerEntry.Sort;
                    mode: QueryMode.MANAGE;
                    view: ResponseViewType;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.LeaveLedgerEntry[], number]>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
