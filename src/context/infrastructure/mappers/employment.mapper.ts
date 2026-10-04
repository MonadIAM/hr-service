import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";

export class EmploymentMapper implements Repositories.Mappers.Contract<
    Entities.Employment,
    Repositories.Mappers.Employment.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.Employment.Filters,
        basic: ORM.ObjectQuery<Entities.Employment> = {},
    ): ORM.ObjectQuery<Entities.Employment> {
        const where: ORM.ObjectQuery<Entities.Employment> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }

        if (filters.termsRevision) {
            where.termsRevision = ORMAdapter.applyOrdinalFilter<number>(filters.termsRevision);
        }
        if (filters.validFrom) {
            where.validFrom = ORMAdapter.applyOrdinalFilter<string>(filters.validFrom);
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }
        if (filters.validTo) {
            where.validTo = ORMAdapter.applyOrdinalFilter<string>(filters.validTo);
        }

        if (filters.replacedByRequest) {
            where.replacedByRequest = {
                id: ORMAdapter.applyStringFilter(filters.replacedByRequest),
            };
        }
        if (filters.workCalendar) {
            where.workCalendar = {
                id: ORMAdapter.applyStringFilter(filters.workCalendar),
            };
        }
        if (filters.workSchedule) {
            where.workSchedule = {
                id: ORMAdapter.applyStringFilter(filters.workSchedule),
            };
        }
        if (filters.leavePolicy) {
            where.leavePolicy = {
                id: ORMAdapter.applyStringFilter(filters.leavePolicy),
            };
        }
        if (filters.employee) {
            where.employee = {
                id: ORMAdapter.applyStringFilter(filters.employee),
            };
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.Employment.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.Employment, P, F> = {},
    ): ORM.FindOptions<Entities.Employment, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.Employment>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
