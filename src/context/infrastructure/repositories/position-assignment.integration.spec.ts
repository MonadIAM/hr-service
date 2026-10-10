import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { PositionAssignmentStatus, PayPeriod } from "~context/enums";

import { PositionAssignmentRepository } from "./position-assignment.repository";

describe("[Repository] - PositionAssignment", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new PositionAssignmentRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - loads persisted fields and relations through the schema", async () => {
            // Arrange
            const entity = await suite.fixtures().createPositionAssignment();

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            // Assert
            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                status: PositionAssignmentStatus.ACTIVE,
                fte: "1.0000",
                validFrom: "2026-01-01",
                positionTitle: "Engineer",
                salaryAmount: "5000.00",
                salaryCurrency: "GBP",
                salaryPeriod: PayPeriod.MONTH,
                placementSnapshot: { title: "Engineer" },
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
            expect(loaded.employee.id).toBe(entity.employee.id);
            expect(loaded.position.id).toBe(entity.position.id);
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - filters by organization and salaryAmount", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createPositionAssignment({ organization });
            await suite.fixtures().createPositionAssignment({ organization, salaryAmount: "4000.00" });
            await suite.fixtures().createPositionAssignment({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    salaryAmount: { operator: PublicOrdinalOperator.EQUAL, value: "5000" },
                },
            });
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });

        it("[case] - filters by organization and fte", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createPositionAssignment({ organization });
            await suite.fixtures().createPositionAssignment({ organization, fte: "0.5000" });
            await suite.fixtures().createPositionAssignment({});

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    fte: { operator: PublicOrdinalOperator.EQUAL, value: "1" },
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
            const matched = await suite.fixtures().createPositionAssignment({ organization });
            await suite.fixtures().createPositionAssignment({ organization });

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

        it("[case] - filters by the position relation", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createPositionAssignment({ organization });
            await suite.fixtures().createPositionAssignment({ organization });

            // Act
            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { position: { operator: PublicLinkOperator.EQUAL, value: matched.position.id } },
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
                .createPositionAssignment({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createPositionAssignment({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createPositionAssignment({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
