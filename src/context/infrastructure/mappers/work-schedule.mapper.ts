import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { CalendarApplication, RecordStatus, SchedulePattern } from "~context/enums";

export class WorkScheduleMapper implements Repositories.Mappers.Contract<
    Entities.WorkSchedule,
    Repositories.Mappers.WorkSchedule.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.WorkSchedule.Filters,
        basic: ORM.ObjectQuery<Entities.WorkSchedule> = {},
    ): ORM.ObjectQuery<Entities.WorkSchedule> {
        const where: ORM.ObjectQuery<Entities.WorkSchedule> = {};

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }

        if (filters.calendarApplication) {
            where.calendarApplication = ORMAdapter.applyStringFilter<CalendarApplication>(filters.calendarApplication);
        }
        if (filters.patternType) {
            where.patternType = ORMAdapter.applyStringFilter<SchedulePattern>(filters.patternType);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<RecordStatus>(filters.status);
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

        return Object.keys(basic).length ? { $and: [basic, where] } : where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.WorkSchedule.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.WorkSchedule, P, F> = {},
    ): ORM.FindOptions<Entities.WorkSchedule, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.WorkSchedule>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
