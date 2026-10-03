import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { RecordStatus } from "~context/enums";

export class WorkCalendarMapper implements Repositories.Mappers.Contract<
    Entities.WorkCalendar,
    Repositories.Mappers.WorkCalendar.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.WorkCalendar.Filters,
        basic: ORM.ObjectQuery<Entities.WorkCalendar> = {},
    ): ORM.ObjectQuery<Entities.WorkCalendar> {
        const where: ORM.ObjectQuery<Entities.WorkCalendar> = {};

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<RecordStatus>(filters.status);
        }
        if (filters.countryCode) {
            where.countryCode = ORMAdapter.applyStringFilter(filters.countryCode);
        }
        if (filters.regionCode) {
            where.regionCode = ORMAdapter.applyStringFilter(filters.regionCode);
        }
        if (filters.code) {
            where.code = ORMAdapter.applyStringFilter(filters.code);
        }
        if (filters.name) {
            where.name = ORMAdapter.applyStringFilter(filters.name);
        }

        if (filters.verifiedThrough) {
            where.verifiedThrough = ORMAdapter.applyOrdinalFilter<string>(filters.verifiedThrough);
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

        return Object.keys(basic).length ? { $and: [basic, where] } : where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.WorkCalendar.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.WorkCalendar, P, F> = {},
    ): ORM.FindOptions<Entities.WorkCalendar, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.WorkCalendar>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
