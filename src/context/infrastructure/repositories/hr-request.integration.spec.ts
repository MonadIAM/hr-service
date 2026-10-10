import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { HRRequestType, HRRequestStatus, HRExecutionStatus } from "~context/enums";

import { HRRequestRepository } from "./hr-request.repository";

describe("HRRequestRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new HRRequestRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createHRRequest();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                type: HRRequestType.ABSENCE,
                status: HRRequestStatus.DRAFT,
                executionStatus: HRExecutionStatus.NOT_STARTED,
                payload: { poolCode: "ANNUAL", days: 5 },
                payloadSchemaVersion: 1,
                revision: 1,
                initiatorAccount: entity.initiatorAccount,
                idempotencyKey: entity.idempotencyKey,
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
            expect(loaded.employee.id).toBe(entity.employee.id);
        });
    });

    describe("findMany", () => {
        it("filters by organization and type", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRRequest({ organization });
            await suite.fixtures().createHRRequest({ organization, type: HRRequestType.HIRE });
            await suite.fixtures().createHRRequest({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    type: { operator: PublicStringOperator.EQUAL, value: HRRequestType.ABSENCE },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and revision", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRRequest({ organization });
            await suite.fixtures().createHRRequest({ organization, revision: 2 });
            await suite.fixtures().createHRRequest({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    revision: { operator: PublicOrdinalOperator.EQUAL, value: 1 },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the employee relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRRequest({ organization });
            await suite.fixtures().createHRRequest({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { employee: { operator: PublicLinkOperator.EQUAL, value: matched.employee.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createHRRequest({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createHRRequest({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createHRRequest({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 2, elementsPerPage: 2 },
                sort: { createdAt: QueryOrder.DESC },
                filters: { organization: { operator: PublicLinkOperator.EQUAL, value: organization.id } },
            });

            expect(total).toBe(3);
            expect(entries.map(({ id }) => id)).toEqual([first.id]);
        });
    });
});
