import { QueryOrder } from "@mikro-orm/postgresql";

import { PayPeriod, PositionAssignmentStatus } from "~context/enums";
import { ORMAdapter } from "~infrastructure/database/utils";

export class PositionAssignmentMapper implements Repositories.Mappers.Contract<
    Entities.PositionAssignment,
    Repositories.Mappers.PositionAssignment.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.PositionAssignment.Filters,
        basic: ORM.ObjectQuery<Entities.PositionAssignment> = {},
    ): ORM.ObjectQuery<Entities.PositionAssignment> {
        const where: ORM.ObjectQuery<Entities.PositionAssignment> = {};

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<PositionAssignmentStatus>(filters.status);
        }
        if (filters.salaryPeriod) {
            where.salaryPeriod = ORMAdapter.applyStringFilter<PayPeriod>(filters.salaryPeriod);
        }
        if (filters.salaryCurrency) {
            where.salaryCurrency = ORMAdapter.applyStringFilter(filters.salaryCurrency);
        }
        if (filters.positionTitle) {
            where.positionTitle = ORMAdapter.applyStringFilter(filters.positionTitle);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.department) {
            where.department = ORMAdapter.applyStringFilter(filters.department);
        }
        if (filters.grade) {
            where.grade = ORMAdapter.applyStringFilter(filters.grade);
        }
        if (filters.team) {
            where.team = ORMAdapter.applyStringFilter(filters.team);
        }

        if (filters.salaryAmount) {
            where.salaryAmount = ORMAdapter.applyOrdinalFilter<string>(filters.salaryAmount);
        }
        if (filters.validFrom) {
            where.validFrom = ORMAdapter.applyOrdinalFilter<string>(filters.validFrom);
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
        if (filters.validTo) {
            where.validTo = ORMAdapter.applyOrdinalFilter<string>(filters.validTo);
        }
        if (filters.fte) {
            where.fte = ORMAdapter.applyOrdinalFilter<string>(filters.fte);
        }

        if (filters.closedByRequest) {
            where.closedByRequest = {
                id: ORMAdapter.applyStringFilter(filters.closedByRequest),
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
        if (filters.position) {
            where.position = {
                id: ORMAdapter.applyStringFilter(filters.position),
            };
        }

        return Object.keys(basic).length ? { $and: [basic, where] } : where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.PositionAssignment.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.PositionAssignment, P, F> = {},
    ): ORM.FindOptions<Entities.PositionAssignment, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.PositionAssignment>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
