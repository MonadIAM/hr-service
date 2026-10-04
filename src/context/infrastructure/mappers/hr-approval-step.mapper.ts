import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { HRApprovalStatus } from "~context/enums";

export class HRApprovalStepMapper implements Repositories.Mappers.Contract<
    Entities.HRApprovalStep,
    Repositories.Mappers.HRApprovalStep.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.HRApprovalStep.Filters,
        basic: ORM.ObjectQuery<Entities.HRApprovalStep> = {},
    ): ORM.ObjectQuery<Entities.HRApprovalStep> {
        const where: ORM.ObjectQuery<Entities.HRApprovalStep> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<HRApprovalStatus>(filters.status);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.name) {
            where.name = ORMAdapter.applyStringFilter(filters.name);
        }

        if (filters.requestRevision) {
            where.requestRevision = ORMAdapter.applyOrdinalFilter<number>(filters.requestRevision);
        }
        if (filters.resolvedAt) {
            where.resolvedAt = ORMAdapter.applyOrdinalFilter<Date>(filters.resolvedAt);
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }
        if (filters.updatedAt) {
            where.updatedAt = ORMAdapter.applyOrdinalFilter<Date>(filters.updatedAt);
        }
        if (filters.ordinal) {
            where.ordinal = ORMAdapter.applyOrdinalFilter<number>(filters.ordinal);
        }
        if (filters.version) {
            where.version = ORMAdapter.applyOrdinalFilter<number>(filters.version);
        }
        if (filters.dueAt) {
            where.dueAt = ORMAdapter.applyOrdinalFilter<Date>(filters.dueAt);
        }

        if (filters.assigneeEmployee) {
            where.assigneeEmployee = {
                id: ORMAdapter.applyStringFilter(filters.assigneeEmployee),
            };
        }
        if (filters.decision) {
            where.decision = {
                id: ORMAdapter.applyStringFilter(filters.decision),
            };
        }
        if (filters.request) {
            where.request = {
                id: ORMAdapter.applyStringFilter(filters.request),
            };
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.HRApprovalStep.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.HRApprovalStep, P, F> = {},
    ): ORM.FindOptions<Entities.HRApprovalStep, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.HRApprovalStep>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
