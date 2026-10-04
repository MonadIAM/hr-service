import { ORMAdapter } from "~infrastructure/database/utils";

export class OrganizationMapper implements Repositories.Mappers.Contract<
    Entities.Organization,
    Repositories.Mappers.Organization.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.Organization.Filters,
        basic: ORM.ObjectQuery<Entities.Organization> = {},
    ): ORM.ObjectQuery<Entities.Organization> {
        const where: ORM.ObjectQuery<Entities.Organization> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.realm) {
            where.realm = ORMAdapter.applyStringFilter(filters.realm);
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.Organization.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.Organization, P, F> = {},
    ): ORM.FindOptions<Entities.Organization, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.Organization>(sort, {}),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
