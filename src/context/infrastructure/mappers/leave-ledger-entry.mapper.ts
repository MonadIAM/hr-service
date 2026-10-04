import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { LeaveLedgerKind, LeaveUnit } from "~context/enums";

export class LeaveLedgerEntryMapper implements Repositories.Mappers.Contract<
    Entities.LeaveLedgerEntry,
    Repositories.Mappers.LeaveLedgerEntry.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.LeaveLedgerEntry.Filters,
        basic: ORM.ObjectQuery<Entities.LeaveLedgerEntry> = {},
    ): ORM.ObjectQuery<Entities.LeaveLedgerEntry> {
        const where: ORM.ObjectQuery<Entities.LeaveLedgerEntry> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.idempotencyKey) {
            where.idempotencyKey = ORMAdapter.applyStringFilter(filters.idempotencyKey);
        }
        if (filters.kind) {
            where.kind = ORMAdapter.applyStringFilter<LeaveLedgerKind>(filters.kind);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.unit) {
            where.unit = ORMAdapter.applyStringFilter<LeaveUnit>(filters.unit);
        }
        if (filters.poolCode) {
            where.poolCode = ORMAdapter.applyStringFilter(filters.poolCode);
        }
        if (filters.reason) {
            where.reason = ORMAdapter.applyStringFilter(filters.reason);
        }

        if (filters.entitlementPeriodStart) {
            where.entitlementPeriodStart = ORMAdapter.applyOrdinalFilter<string>(filters.entitlementPeriodStart);
        }
        if (filters.entitlementPeriodEnd) {
            where.entitlementPeriodEnd = ORMAdapter.applyOrdinalFilter<string>(filters.entitlementPeriodEnd);
        }
        if (filters.reservedDelta) {
            where.reservedDelta = ORMAdapter.applyOrdinalFilter<string>(filters.reservedDelta);
        }
        if (filters.balanceDelta) {
            where.balanceDelta = ORMAdapter.applyOrdinalFilter<string>(filters.balanceDelta);
        }
        if (filters.effectiveOn) {
            where.effectiveOn = ORMAdapter.applyOrdinalFilter<string>(filters.effectiveOn);
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }

        if (filters.reversedByEntry) {
            where.reversedByEntry = {
                id: ORMAdapter.applyStringFilter(filters.reversedByEntry),
            };
        }
        if (filters.reversesEntry) {
            where.reversesEntry = {
                id: ORMAdapter.applyStringFilter(filters.reversesEntry),
            };
        }
        if (filters.sourceRequest) {
            where.sourceRequest = {
                id: ORMAdapter.applyStringFilter(filters.sourceRequest),
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
        if (filters.absence) {
            where.absence = {
                id: ORMAdapter.applyStringFilter(filters.absence),
            };
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.LeaveLedgerEntry.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.LeaveLedgerEntry, P, F> = {},
    ): ORM.FindOptions<Entities.LeaveLedgerEntry, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.LeaveLedgerEntry>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
