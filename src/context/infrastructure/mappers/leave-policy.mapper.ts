import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { RecordStatus } from "~context/enums";

export class LeavePolicyMapper implements Repositories.Mappers.Contract<
    Entities.LeavePolicy,
    Repositories.Mappers.LeavePolicy.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.LeavePolicy.Filters,
        basic: ORM.ObjectQuery<Entities.LeavePolicy> = {},
    ): ORM.ObjectQuery<Entities.LeavePolicy> {
        const where: ORM.ObjectQuery<Entities.LeavePolicy> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<RecordStatus>(filters.status);
        }
        if (filters.jurisdiction) {
            where.jurisdiction = ORMAdapter.applyStringFilter(filters.jurisdiction);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.code) {
            where.code = ORMAdapter.applyStringFilter(filters.code);
        }
        if (filters.name) {
            where.name = ORMAdapter.applyStringFilter(filters.name);
        }

        if (filters.revision) {
            where.revision = ORMAdapter.applyOrdinalFilter<number>(filters.revision);
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }
        if (filters.updatedAt) {
            where.updatedAt = ORMAdapter.applyOrdinalFilter<Date>(filters.updatedAt);
        }
        if (filters.version) {
            where.version = ORMAdapter.applyOrdinalFilter<number>(filters.version);
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.LeavePolicy.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.LeavePolicy, P, F> = {},
    ): ORM.FindOptions<Entities.LeavePolicy, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.LeavePolicy>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
