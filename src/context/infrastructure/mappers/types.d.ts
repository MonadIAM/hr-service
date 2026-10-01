import { QueryOrder } from "@mikro-orm/postgresql";

import { LinkFilterDTO, OrdinalFilterDTO, StringFilterDTO } from "~common/dto";

declare global {
    namespace Repositories {
        namespace Mappers {
            type Meta = {
                Filters: unknown;
                Sort: unknown;
            };

            interface Contract<E, A extends Meta> {
                buildWhereORM(filters: A["Filters"], basic?: ORM.ObjectQuery<E>): ORM.FilterQuery<E>;
                buildOptionsORM<P extends string, F extends string>(
                    sort: A["Sort"],
                    pagination: Pagination,
                    options?: ORM.FindOptions<E, P, F>,
                ): ORM.FindOptions<E, P, F>;
            }

            namespace AuditLog {
                type Filters = {
                    id?: StringFilterDTO;
                    realm?: LinkFilterDTO;
                    actor?: LinkFilterDTO;
                    ip?: StringFilterDTO;
                    userAgent?: StringFilterDTO;
                    actionType?: StringFilterDTO;
                    entityType?: StringFilterDTO;
                    createdAt?: OrdinalFilterDTO<Date>;
                };

                type Sort = {
                    createdAt?: QueryOrder;
                    at?: QueryOrder;
                };

                interface Types {
                    Filters: Filters;
                    Sort: Sort;
                }
            }

            namespace ChangeLog {
                type Filters = {
                    id?: StringFilterDTO;
                    entity?: StringFilterDTO;
                    changeType?: StringFilterDTO;
                    entityType?: StringFilterDTO;
                    auditEntry?: StringFilterDTO;
                    createdAt?: OrdinalFilterDTO<Date>;
                };

                type Sort = {
                    createdAt?: QueryOrder;
                    at?: QueryOrder;
                };

                interface Types {
                    Filters: Filters;
                    Sort: Sort;
                }
            }
        }
    }
}
