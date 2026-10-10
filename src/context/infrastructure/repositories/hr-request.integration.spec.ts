import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { HRRequestType, HRRequestStatus, HRExecutionStatus } from "~context/enums";

import { HRRequestRepository } from "./hr-request.repository";

describe("[Repository] - HRRequest", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new HRRequestRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - loads persisted fields and relations through the schema", async () => {
            // Arrange
            const entity = await suite.fixtures().createHRRequest();

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            // Assert
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

    describe("[Method] - findMany", () => {
        it("[case] - filters by organization and type", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRRequest({ organization });
            await suite.fixtures().createHRRequest({ organization, type: HRRequestType.HIRE });
            await suite.fixtures().createHRRequest({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    type: { operator: PublicStringOperator.EQUAL, value: HRRequestType.ABSENCE },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by organization and revision", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRRequest({ organization });
            await suite.fixtures().createHRRequest({ organization, revision: 2 });
            await suite.fixtures().createHRRequest({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    revision: { operator: PublicOrdinalOperator.EQUAL, value: 1 },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by the employee relation", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRRequest({ organization });
            await suite.fixtures().createHRRequest({ organization });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { employee: { operator: PublicLinkOperator.EQUAL, value: matched.employee.id } },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - sorts and paginates while preserving the total count", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createHRRequest({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createHRRequest({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createHRRequest({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 2, elementsPerPage: 2 },
                sort: { createdAt: QueryOrder.DESC },
                filters: { organization: { operator: PublicLinkOperator.EQUAL, value: organization.id } },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(3);
            expect(result1).toEqual([first.id]);
        });
    });
});
