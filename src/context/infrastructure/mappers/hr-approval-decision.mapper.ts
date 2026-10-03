import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { HRDecisionKind } from "~context/enums";

export class HRApprovalDecisionMapper implements Repositories.Mappers.Contract<
    Entities.HRApprovalDecision,
    Repositories.Mappers.HRApprovalDecision.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.HRApprovalDecision.Filters,
        basic: ORM.ObjectQuery<Entities.HRApprovalDecision> = {},
    ): ORM.ObjectQuery<Entities.HRApprovalDecision> {
        const where: ORM.ObjectQuery<Entities.HRApprovalDecision> = {};

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.decision) {
            where.decision = ORMAdapter.applyStringFilter<HRDecisionKind>(filters.decision);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.actorAccount) {
            where.actorAccount = ORMAdapter.applyStringFilter(filters.actorAccount);
        }
        if (filters.comment) {
            where.comment = ORMAdapter.applyStringFilter(filters.comment);
        }
        if (filters.request) {
            where.request = ORMAdapter.applyStringFilter(filters.request);
        }

        if (filters.requestRevision) {
            where.requestRevision = ORMAdapter.applyOrdinalFilter<number>(filters.requestRevision);
        }
        if (filters.decidedAt) {
            where.decidedAt = ORMAdapter.applyOrdinalFilter<Date>(filters.decidedAt);
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }

        if (filters.actorEmployee) {
            where.actorEmployee = {
                id: ORMAdapter.applyStringFilter(filters.actorEmployee),
            };
        }
        if (filters.step) {
            where.step = {
                id: ORMAdapter.applyStringFilter(filters.step),
            };
        }

        return Object.keys(basic).length ? { $and: [basic, where] } : where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.HRApprovalDecision.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.HRApprovalDecision, P, F> = {},
    ): ORM.FindOptions<Entities.HRApprovalDecision, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.HRApprovalDecision>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
