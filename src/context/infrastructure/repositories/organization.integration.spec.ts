import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";

import { OrganizationRepository } from "./organization.repository";

describe("[Repository] - Organization", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new OrganizationRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - loads the organization projection and its realm", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: organization.id } });

            // Assert
            expect(loaded).toMatchObject({
                id: organization.id,
                realm: organization.realm,
            });
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - filters organization projections by realm", async () => {
            // Arrange
            const matched = await suite.fixtures().createOrganization();
            await suite.fixtures().createOrganization();

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { realm: { operator: PublicLinkOperator.EQUAL, value: matched.realm } },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters organization projections by id", async () => {
            // Arrange
            const matched = await suite.fixtures().createOrganization();
            await suite.fixtures().createOrganization();

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: {
                    id: { operator: PublicStringOperator.EQUAL, value: matched.id },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - returns no projections for an unknown realm", async () => {
            // Arrange
            await suite.fixtures().createOrganization();
            const realm = randomUUID();

            // Act
            const list = suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { realm: { operator: PublicLinkOperator.EQUAL, value: realm } },
            });
            const result = await list;

            // Assert
            expect(result).toEqual([[], 0]);
        });
    });
});
