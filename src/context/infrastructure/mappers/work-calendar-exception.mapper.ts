import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { DayOverride } from "~context/enums";

export class WorkCalendarExceptionMapper implements Repositories.Mappers.Contract<
    Entities.WorkCalendarException,
    Repositories.Mappers.WorkCalendarException.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.WorkCalendarException.Filters,
        basic: ORM.ObjectQuery<Entities.WorkCalendarException> = {},
    ): ORM.ObjectQuery<Entities.WorkCalendarException> {
        const where: ORM.ObjectQuery<Entities.WorkCalendarException> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.workdayOverride) {
            where.workdayOverride = ORMAdapter.applyStringFilter<DayOverride>(filters.workdayOverride);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.source) {
            where.source = ORMAdapter.applyStringFilter(filters.source);
        }
        if (filters.name) {
            where.name = ORMAdapter.applyStringFilter(filters.name);
        }

        if (filters.shortenedByMinutes) {
            where.shortenedByMinutes = ORMAdapter.applyOrdinalFilter<number>(filters.shortenedByMinutes);
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
        if (filters.date) {
            where.date = ORMAdapter.applyOrdinalFilter<string>(filters.date);
        }

        if (filters.holidayOverride !== undefined) {
            where.holidayOverride = { $eq: filters.holidayOverride };
        }

        if (filters.calendar) {
            where.calendar = {
                id: ORMAdapter.applyStringFilter(filters.calendar),
            };
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.WorkCalendarException.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.WorkCalendarException, P, F> = {},
    ): ORM.FindOptions<Entities.WorkCalendarException, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.WorkCalendarException>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
