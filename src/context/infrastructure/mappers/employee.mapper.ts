import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { EmployeeStatus } from "~context/enums";

export class EmployeeMapper implements Repositories.Mappers.Contract<
    Entities.Employee,
    Repositories.Mappers.Employee.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.Employee.Filters,
        basic: ORM.ObjectQuery<Entities.Employee> = {},
    ): ORM.ObjectQuery<Entities.Employee> {
        const where: ORM.ObjectQuery<Entities.Employee> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.scheduleTimezone) {
            where.scheduleTimezone = ORMAdapter.applyStringFilter(filters.scheduleTimezone);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<EmployeeStatus>(filters.status);
        }
        if (filters.employeeNumber) {
            where.employeeNumber = ORMAdapter.applyStringFilter(filters.employeeNumber);
        }
        if (filters.contractType) {
            where.contractType = ORMAdapter.applyStringFilter(filters.contractType);
        }
        if (filters.organization) {
            where.organization = ORMAdapter.applyStringFilter(filters.organization);
        }
        if (filters.middleName) {
            where.middleName = ORMAdapter.applyStringFilter(filters.middleName);
        }
        if (filters.workEmail) {
            where.workEmail = ORMAdapter.applyStringFilter(filters.workEmail);
        }
        if (filters.firstName) {
            where.firstName = ORMAdapter.applyStringFilter(filters.firstName);
        }
        if (filters.lastName) {
            where.lastName = ORMAdapter.applyStringFilter(filters.lastName);
        }
        if (filters.account) {
            where.account = ORMAdapter.applyStringFilter(filters.account);
        }

        if (filters.employmentStartedOn) {
            where.employmentStartedOn = ORMAdapter.applyOrdinalFilter<string>(filters.employmentStartedOn);
        }
        if (filters.scheduleAnchorDate) {
            where.scheduleAnchorDate = ORMAdapter.applyOrdinalFilter<string>(filters.scheduleAnchorDate);
        }
        if (filters.employmentEndedOn) {
            where.employmentEndedOn = ORMAdapter.applyOrdinalFilter<string>(filters.employmentEndedOn);
        }
        if (filters.termsValidFrom) {
            where.termsValidFrom = ORMAdapter.applyOrdinalFilter<string>(filters.termsValidFrom);
        }
        if (filters.contractEndsOn) {
            where.contractEndsOn = ORMAdapter.applyOrdinalFilter<string>(filters.contractEndsOn);
        }
        if (filters.termsRevision) {
            where.termsRevision = ORMAdapter.applyOrdinalFilter<number>(filters.termsRevision);
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

        if (filters.workCalendar) {
            where.workCalendar = {
                id: ORMAdapter.applyStringFilter(filters.workCalendar),
            };
        }
        if (filters.workSchedule) {
            where.workSchedule = {
                id: ORMAdapter.applyStringFilter(filters.workSchedule),
            };
        }
        if (filters.leavePolicy) {
            where.leavePolicy = {
                id: ORMAdapter.applyStringFilter(filters.leavePolicy),
            };
        }
        if (filters.hrBpEmployee) {
            where.hrBpEmployee = {
                id: ORMAdapter.applyStringFilter(filters.hrBpEmployee),
            };
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Repositories.Mappers.Employee.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.Employee, P, F> = {},
    ): ORM.FindOptions<Entities.Employee, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.Employee>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
