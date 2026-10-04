import { QueryOrder } from "@mikro-orm/postgresql";

import { LinkFilterDTO, OrdinalFilterDTO, StringFilterDTO } from "~common/dto";

declare global {
    namespace Repositories.Mappers {
        type Meta = {
            Filters: unknown;
            Sort: unknown;
        };

        interface Contract<E, A extends Meta> {
            buildWhereORM(filters: A["Filters"], basic?: ORM.ObjectQuery<E>): ORM.FilterQuery<E>;
            buildOptionsORM<P extends string, F extends string>(
                sort: A["Sort"],
                pagination: Pagination,
                options?: ORM.FindOptions<E, P, F>,
            ): ORM.FindOptions<E, P, F>;
        }

        namespace AuditLog {
            type Filters = {
                id?: StringFilterDTO;
                actionType?: StringFilterDTO;
                entityType?: StringFilterDTO;
                userAgent?: StringFilterDTO;
                ip?: StringFilterDTO;
                createdAt?: OrdinalFilterDTO<Date>;
                realm?: LinkFilterDTO;
                actor?: LinkFilterDTO;
            };

            type Sort = {
                createdAt?: QueryOrder;
                at?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace ChangeLog {
            type Filters = {
                id?: StringFilterDTO;
                changeType?: StringFilterDTO;
                entityType?: StringFilterDTO;
                auditEntry?: StringFilterDTO;
                entity?: StringFilterDTO;
                createdAt?: OrdinalFilterDTO<Date>;
            };

            type Sort = {
                createdAt?: QueryOrder;
                at?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Organization {
            type Filters = {
                id?: StringFilterDTO;
                realm?: LinkFilterDTO;
            };

            type Sort = Record<string, never>;

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Absence {
            type Filters = {
                id?: StringFilterDTO;
                sourceItemKey?: StringFilterDTO;
                timezone?: StringFilterDTO;
                poolCode?: StringFilterDTO;
                status?: StringFilterDTO;
                unit?: StringFilterDTO;
                startDate?: OrdinalFilterDTO<string>;
                quantity?: OrdinalFilterDTO<string>;
                endDate?: OrdinalFilterDTO<string>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                startsAt?: OrdinalFilterDTO<Date>;
                endsAt?: OrdinalFilterDTO<Date>;
                cancelledByRequest?: LinkFilterDTO;
                sourceRequest?: LinkFilterDTO;
                organization?: LinkFilterDTO;
                leavePolicy?: LinkFilterDTO;
                employee?: LinkFilterDTO;
            };

            type Sort = {
                startDate?: QueryOrder;
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                quantity?: QueryOrder;
                startsAt?: QueryOrder;
                version?: QueryOrder;
                endDate?: QueryOrder;
                endsAt?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Employee {
            type Filters = {
                id?: StringFilterDTO;
                scheduleTimezone?: StringFilterDTO;
                employeeNumber?: StringFilterDTO;
                contractType?: StringFilterDTO;
                middleName?: StringFilterDTO;
                workEmail?: StringFilterDTO;
                firstName?: StringFilterDTO;
                lastName?: StringFilterDTO;
                status?: StringFilterDTO;
                employmentStartedOn?: OrdinalFilterDTO<string>;
                scheduleAnchorDate?: OrdinalFilterDTO<string>;
                employmentEndedOn?: OrdinalFilterDTO<string>;
                termsValidFrom?: OrdinalFilterDTO<string>;
                contractEndsOn?: OrdinalFilterDTO<string>;
                termsRevision?: OrdinalFilterDTO<number>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                organization?: LinkFilterDTO;
                workCalendar?: LinkFilterDTO;
                workSchedule?: LinkFilterDTO;
                hrBpEmployee?: LinkFilterDTO;
                leavePolicy?: LinkFilterDTO;
                account?: LinkFilterDTO;
            };

            type Sort = {
                employmentStartedOn?: QueryOrder;
                scheduleAnchorDate?: QueryOrder;
                employmentEndedOn?: QueryOrder;
                termsValidFrom?: QueryOrder;
                contractEndsOn?: QueryOrder;
                termsRevision?: QueryOrder;
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                version?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Employment {
            type Filters = {
                id?: StringFilterDTO;
                termsRevision?: OrdinalFilterDTO<number>;
                validFrom?: OrdinalFilterDTO<string>;
                createdAt?: OrdinalFilterDTO<Date>;
                validTo?: OrdinalFilterDTO<string>;
                replacedByRequest?: LinkFilterDTO;
                organization?: LinkFilterDTO;
                workCalendar?: LinkFilterDTO;
                workSchedule?: LinkFilterDTO;
                leavePolicy?: LinkFilterDTO;
                employee?: LinkFilterDTO;
            };

            type Sort = {
                termsRevision?: QueryOrder;
                createdAt?: QueryOrder;
                validFrom?: QueryOrder;
                validTo?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace HRApprovalDecision {
            type Filters = {
                id?: StringFilterDTO;
                decision?: StringFilterDTO;
                comment?: StringFilterDTO;
                requestRevision?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                decidedAt?: OrdinalFilterDTO<Date>;
                actorEmployee?: LinkFilterDTO;
                organization?: LinkFilterDTO;
                actorAccount?: LinkFilterDTO;
                request?: LinkFilterDTO;
                step?: LinkFilterDTO;
            };

            type Sort = {
                requestRevision?: QueryOrder;
                createdAt?: QueryOrder;
                decidedAt?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace HRApprovalStep {
            type Filters = {
                id?: StringFilterDTO;
                status?: StringFilterDTO;
                name?: StringFilterDTO;
                requestRevision?: OrdinalFilterDTO<number>;
                resolvedAt?: OrdinalFilterDTO<Date>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                ordinal?: OrdinalFilterDTO<number>;
                dueAt?: OrdinalFilterDTO<Date>;
                assigneeEmployee?: LinkFilterDTO;
                organization?: LinkFilterDTO;
                decision?: LinkFilterDTO;
                request?: LinkFilterDTO;
            };

            type Sort = {
                requestRevision?: QueryOrder;
                resolvedAt?: QueryOrder;
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                version?: QueryOrder;
                ordinal?: QueryOrder;
                dueAt?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace HRRequest {
            type Filters = {
                id?: StringFilterDTO;
                executionStatus?: StringFilterDTO;
                idempotencyKey?: StringFilterDTO;
                workflowCode?: StringFilterDTO;
                failure?: StringFilterDTO;
                status?: StringFilterDTO;
                type?: StringFilterDTO;
                payloadSchemaVersion?: OrdinalFilterDTO<number>;
                approvedRevision?: OrdinalFilterDTO<number>;
                workflowVersion?: OrdinalFilterDTO<number>;
                appliedRevision?: OrdinalFilterDTO<number>;
                effectiveAt?: OrdinalFilterDTO<Date>;
                submittedAt?: OrdinalFilterDTO<Date>;
                approvedAt?: OrdinalFilterDTO<Date>;
                revision?: OrdinalFilterDTO<number>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                appliedAt?: OrdinalFilterDTO<Date>;
                initiatorEmployee?: LinkFilterDTO;
                initiatorAccount?: LinkFilterDTO;
                relatedRequest?: LinkFilterDTO;
                targetPosition?: LinkFilterDTO;
                organization?: LinkFilterDTO;
                employee?: LinkFilterDTO;
            };

            type Sort = {
                payloadSchemaVersion?: QueryOrder;
                approvedRevision?: QueryOrder;
                workflowVersion?: QueryOrder;
                appliedRevision?: QueryOrder;
                effectiveAt?: QueryOrder;
                submittedAt?: QueryOrder;
                approvedAt?: QueryOrder;
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                appliedAt?: QueryOrder;
                revision?: QueryOrder;
                version?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace LeaveLedgerEntry {
            type Filters = {
                id?: StringFilterDTO;
                idempotencyKey?: StringFilterDTO;
                poolCode?: StringFilterDTO;
                reason?: StringFilterDTO;
                kind?: StringFilterDTO;
                unit?: StringFilterDTO;
                entitlementPeriodStart?: OrdinalFilterDTO<string>;
                entitlementPeriodEnd?: OrdinalFilterDTO<string>;
                reservedDelta?: OrdinalFilterDTO<string>;
                balanceDelta?: OrdinalFilterDTO<string>;
                effectiveOn?: OrdinalFilterDTO<string>;
                createdAt?: OrdinalFilterDTO<Date>;
                reversedByEntry?: LinkFilterDTO;
                reversesEntry?: LinkFilterDTO;
                sourceRequest?: LinkFilterDTO;
                organization?: LinkFilterDTO;
                leavePolicy?: LinkFilterDTO;
                employee?: LinkFilterDTO;
                absence?: LinkFilterDTO;
            };

            type Sort = {
                entitlementPeriodStart?: QueryOrder;
                entitlementPeriodEnd?: QueryOrder;
                reservedDelta?: QueryOrder;
                balanceDelta?: QueryOrder;
                effectiveOn?: QueryOrder;
                createdAt?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace LeavePolicy {
            type Filters = {
                id?: StringFilterDTO;
                jurisdiction?: StringFilterDTO;
                status?: StringFilterDTO;
                code?: StringFilterDTO;
                name?: StringFilterDTO;
                revision?: OrdinalFilterDTO<number>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                organization?: LinkFilterDTO;
            };

            type Sort = {
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                revision?: QueryOrder;
                version?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace PositionAssignment {
            type Filters = {
                id?: StringFilterDTO;
                salaryCurrency?: StringFilterDTO;
                positionTitle?: StringFilterDTO;
                salaryPeriod?: StringFilterDTO;
                status?: StringFilterDTO;
                grade?: StringFilterDTO;
                salaryAmount?: OrdinalFilterDTO<string>;
                validFrom?: OrdinalFilterDTO<string>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                validTo?: OrdinalFilterDTO<string>;
                fte?: OrdinalFilterDTO<string>;
                closedByRequest?: LinkFilterDTO;
                sourceRequest?: LinkFilterDTO;
                organization?: LinkFilterDTO;
                department?: LinkFilterDTO;
                employee?: LinkFilterDTO;
                position?: LinkFilterDTO;
                team?: LinkFilterDTO;
            };

            type Sort = {
                salaryAmount?: QueryOrder;
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                validFrom?: QueryOrder;
                version?: QueryOrder;
                validTo?: QueryOrder;
                fte?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Position {
            type Filters = {
                id?: StringFilterDTO;
                budgetCurrency?: StringFilterDTO;
                budgetPeriod?: StringFilterDTO;
                requirements?: StringFilterDTO;
                description?: StringFilterDTO;
                status?: StringFilterDTO;
                grade?: StringFilterDTO;
                title?: StringFilterDTO;
                code?: StringFilterDTO;
                budgetAmount?: OrdinalFilterDTO<string>;
                plannedFte?: OrdinalFilterDTO<string>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                organization?: LinkFilterDTO;
                department?: LinkFilterDTO;
                team?: LinkFilterDTO;
            };

            type Sort = {
                budgetAmount?: QueryOrder;
                plannedFte?: QueryOrder;
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                version?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace WorkCalendarException {
            type Filters = {
                id?: StringFilterDTO;
                workdayOverride?: StringFilterDTO;
                source?: StringFilterDTO;
                name?: StringFilterDTO;
                shortenedByMinutes?: OrdinalFilterDTO<number>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                date?: OrdinalFilterDTO<string>;

                holidayOverride?: boolean;

                organization?: LinkFilterDTO;
                calendar?: LinkFilterDTO;
            };

            type Sort = {
                shortenedByMinutes?: QueryOrder;
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                version?: QueryOrder;
                date?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace WorkCalendar {
            type Filters = {
                id?: StringFilterDTO;
                countryCode?: StringFilterDTO;
                regionCode?: StringFilterDTO;
                status?: StringFilterDTO;
                code?: StringFilterDTO;
                name?: StringFilterDTO;
                verifiedThrough?: OrdinalFilterDTO<string>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                organization?: LinkFilterDTO;
            };

            type Sort = {
                verifiedThrough?: QueryOrder;
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                version?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace WorkSchedule {
            type Filters = {
                id?: StringFilterDTO;
                calendarApplication?: StringFilterDTO;
                patternType?: StringFilterDTO;
                status?: StringFilterDTO;
                code?: StringFilterDTO;
                name?: StringFilterDTO;
                revision?: OrdinalFilterDTO<number>;
                version?: OrdinalFilterDTO<number>;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
                organization?: LinkFilterDTO;
            };

            type Sort = {
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
                revision?: QueryOrder;
                version?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }
    }
}
