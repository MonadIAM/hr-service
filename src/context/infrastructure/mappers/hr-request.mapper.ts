import { QueryOrder } from "@mikro-orm/postgresql";

import { HRExecutionStatus, HRRequestStatus, HRRequestType } from "~context/enums";
import { ORMAdapter } from "~infrastructure/database/utils";

export class HRRequestMapper implements Repositories.Mappers.Contract<
    Entities.HRRequest,
    Repositories.Mappers.HRRequest.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.HRRequest.Filters,
        basic: ORM.ObjectQuery<Entities.HRRequest> = {},
    ): ORM.ObjectQuery<Entities.HRRequest> {
        const where: ORM.ObjectQuery<Entities.HRRequest> = {};

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.executionStatus) {
            where.executionStatus = ORMAdapter.applyStringFilter<HRExecutionStatus>(filters.executionStatus);
        }
        if (filters.initiatorAccount) {
            where.initiatorAccount = ORMAdapter.applyStringFilter(filters.initiatorAccount);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<HRRequestStatus>(filters.status);
        }
        if (filters.idempotencyKey) {
            where.idempotencyKey = ORMAdapter.applyStringFilter(filters.idempotencyKey);
        }
        if (filters.workflowCode) {
            where.workflowCode = ORMAdapter.applyStringFilter(filters.workflowCode);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.type) {
            where.type = ORMAdapter.applyStringFilter<HRRequestType>(filters.type);
        }
        if (filters.failure) {
            where.failure = ORMAdapter.applyStringFilter(filters.failure);
        }

        if (filters.payloadSchemaVersion) {
            where.payloadSchemaVersion = ORMAdapter.applyOrdinalFilter<number>(filters.payloadSchemaVersion);
        }
        if (filters.approvedRevision) {
            where.approvedRevision = ORMAdapter.applyOrdinalFilter<number>(filters.approvedRevision);
        }
        if (filters.workflowVersion) {
            where.workflowVersion = ORMAdapter.applyOrdinalFilter<number>(filters.workflowVersion);
        }
        if (filters.appliedRevision) {
            where.appliedRevision = ORMAdapter.applyOrdinalFilter<number>(filters.appliedRevision);
        }
        if (filters.effectiveAt) {
            where.effectiveAt = ORMAdapter.applyOrdinalFilter<Date>(filters.effectiveAt);
        }
        if (filters.submittedAt) {
            where.submittedAt = ORMAdapter.applyOrdinalFilter<Date>(filters.submittedAt);
        }
        if (filters.approvedAt) {
            where.approvedAt = ORMAdapter.applyOrdinalFilter<Date>(filters.approvedAt);
        }
        if (filters.appliedAt) {
            where.appliedAt = ORMAdapter.applyOrdinalFilter<Date>(filters.appliedAt);
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

        if (filters.initiatorEmployee) {
            where.initiatorEmployee = {
                id: ORMAdapter.applyStringFilter(filters.initiatorEmployee),
            };
        }
        if (filters.relatedRequest) {
            where.relatedRequest = {
                id: ORMAdapter.applyStringFilter(filters.relatedRequest),
            };
        }
        if (filters.targetPosition) {
            where.targetPosition = {
                id: ORMAdapter.applyStringFilter(filters.targetPosition),
            };
        }
        if (filters.employee) {
            where.employee = {
                id: ORMAdapter.applyStringFilter(filters.employee),
            };
        }

        return Object.keys(basic).length ? { $and: [basic, where] } : where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.HRRequest.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.HRRequest, P, F> = {},
    ): ORM.FindOptions<Entities.HRRequest, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.HRRequest>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
