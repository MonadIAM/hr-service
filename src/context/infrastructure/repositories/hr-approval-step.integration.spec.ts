import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { HRApprovalStatus } from "~context/enums";

import { HRApprovalStepRepository } from "./hr-approval-step.repository";

describe("[Repository] - HRApprovalStep", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new HRApprovalStepRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - loads persisted fields and relations through the schema", async () => {
            // Arrange
            const entity = await suite.fixtures().createHRApprovalStep();

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            // Assert
            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                status: HRApprovalStatus.WAITING,
                requestRevision: 1,
                ordinal: 1,
                name: "Manager approval",
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
            expect(loaded.request.id).toBe(entity.request.id);
            expect(loaded.assigneeEmployee.id).toBe(entity.assigneeEmployee.id);
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - filters by organization and status", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalStep({ organization });
            await suite.fixtures().createHRApprovalStep({ organization, status: HRApprovalStatus.ACTIVE });
            await suite.fixtures().createHRApprovalStep({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    status: { operator: PublicStringOperator.EQUAL, value: HRApprovalStatus.WAITING },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by organization and ordinal", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalStep({ organization });
            await suite.fixtures().createHRApprovalStep({ organization, ordinal: 2 });
            await suite.fixtures().createHRApprovalStep({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    ordinal: { operator: PublicOrdinalOperator.EQUAL, value: 1 },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by the request relation", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalStep({ organization });
            await suite.fixtures().createHRApprovalStep({ organization });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { request: { operator: PublicLinkOperator.EQUAL, value: matched.request.id } },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by the assigneeEmployee relation", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalStep({ organization });
            await suite.fixtures().createHRApprovalStep({ organization });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { assigneeEmployee: { operator: PublicLinkOperator.EQUAL, value: matched.assigneeEmployee.id } },
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
                .createHRApprovalStep({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createHRApprovalStep({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createHRApprovalStep({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
