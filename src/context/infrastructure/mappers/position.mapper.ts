import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { PayPeriod, RecordStatus } from "~context/enums";

export class PositionMapper implements Repositories.Mappers.Contract<
    Entities.Position,
    Repositories.Mappers.Position.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.Position.Filters,
        basic: ORM.ObjectQuery<Entities.Position> = {},
    ): ORM.ObjectQuery<Entities.Position> {
        const where: ORM.ObjectQuery<Entities.Position> = {};

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.budgetPeriod) {
            where.budgetPeriod = ORMAdapter.applyStringFilter<PayPeriod>(filters.budgetPeriod);
        }
        if (filters.budgetCurrency) {
            where.budgetCurrency = ORMAdapter.applyStringFilter(filters.budgetCurrency);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<RecordStatus>(filters.status);
        }
        if (filters.requirements) {
            where.requirements = ORMAdapter.applyStringFilter(filters.requirements);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.description) {
            where.description = ORMAdapter.applyStringFilter(filters.description);
        }
        if (filters.department) {
            where.department = ORMAdapter.applyStringFilter(filters.department);
        }
        if (filters.grade) {
            where.grade = ORMAdapter.applyStringFilter(filters.grade);
        }
        if (filters.title) {
            where.title = ORMAdapter.applyStringFilter(filters.title);
        }
        if (filters.team) {
            where.team = ORMAdapter.applyStringFilter(filters.team);
        }
        if (filters.code) {
            where.code = ORMAdapter.applyStringFilter(filters.code);
        }

        if (filters.budgetAmount) {
            where.budgetAmount = ORMAdapter.applyOrdinalFilter<string>(filters.budgetAmount);
        }
        if (filters.plannedFte) {
            where.plannedFte = ORMAdapter.applyOrdinalFilter<string>(filters.plannedFte);
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
        sort: Repositories.Mappers.Position.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.Position, P, F> = {},
    ): ORM.FindOptions<Entities.Position, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.Position>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
