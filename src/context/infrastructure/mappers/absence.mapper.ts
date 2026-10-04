import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { AbsenceStatus, LeaveUnit } from "~context/enums";

export class AbsenceMapper implements Repositories.Mappers.Contract<Entities.Absence, Repositories.Mappers.Absence.Types> {
    public buildWhereORM(
        filters: Repositories.Mappers.Absence.Filters,
        basic: ORM.ObjectQuery<Entities.Absence> = {},
    ): ORM.ObjectQuery<Entities.Absence> {
        const where: ORM.ObjectQuery<Entities.Absence> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<AbsenceStatus>(filters.status);
        }
        if (filters.sourceItemKey) {
            where.sourceItemKey = ORMAdapter.applyStringFilter(filters.sourceItemKey);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.unit) {
            where.unit = ORMAdapter.applyStringFilter<LeaveUnit>(filters.unit);
        }
        if (filters.timezone) {
            where.timezone = ORMAdapter.applyStringFilter(filters.timezone);
        }
        if (filters.poolCode) {
            where.poolCode = ORMAdapter.applyStringFilter(filters.poolCode);
        }

        if (filters.startDate) {
            where.startDate = ORMAdapter.applyOrdinalFilter<string>(filters.startDate);
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }
        if (filters.updatedAt) {
            where.updatedAt = ORMAdapter.applyOrdinalFilter<Date>(filters.updatedAt);
        }
        if (filters.quantity) {
            where.quantity = ORMAdapter.applyOrdinalFilter<string>(filters.quantity);
        }
        if (filters.version) {
            where.version = ORMAdapter.applyOrdinalFilter<number>(filters.version);
        }
        if (filters.endDate) {
            where.endDate = ORMAdapter.applyOrdinalFilter<string>(filters.endDate);
        }
        if (filters.startsAt) {
            where.startsAt = ORMAdapter.applyOrdinalFilter<Date>(filters.startsAt);
        }
        if (filters.endsAt) {
            where.endsAt = ORMAdapter.applyOrdinalFilter<Date>(filters.endsAt);
        }

        if (filters.cancelledByRequest) {
            where.cancelledByRequest = {
                id: ORMAdapter.applyStringFilter(filters.cancelledByRequest),
            };
        }
        if (filters.leavePolicy) {
            where.leavePolicy = {
                id: ORMAdapter.applyStringFilter(filters.leavePolicy),
            };
        }
        if (filters.sourceRequest) {
            where.sourceRequest = {
                id: ORMAdapter.applyStringFilter(filters.sourceRequest),
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
        sort: Repositories.Mappers.Absence.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.Absence, P, F> = {},
    ): ORM.FindOptions<Entities.Absence, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.Absence>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
