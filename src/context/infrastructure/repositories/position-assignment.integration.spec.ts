import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { PositionAssignmentStatus, PayPeriod } from "~context/enums";

import { PositionAssignmentRepository } from "./position-assignment.repository";

describe("PositionAssignmentRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new PositionAssignmentRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createPositionAssignment();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

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

    describe("findMany", () => {
        it("filters by organization and salaryAmount", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createPositionAssignment({ organization });
            await suite.fixtures().createPositionAssignment({ organization, salaryAmount: "4000.00" });
            await suite.fixtures().createPositionAssignment({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    salaryAmount: { operator: PublicOrdinalOperator.EQUAL, value: "5000" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and fte", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createPositionAssignment({ organization });
            await suite.fixtures().createPositionAssignment({ organization, fte: "0.5000" });
            await suite.fixtures().createPositionAssignment({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    fte: { operator: PublicOrdinalOperator.EQUAL, value: "1" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the employee relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createPositionAssignment({ organization });
            await suite.fixtures().createPositionAssignment({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { employee: { operator: PublicLinkOperator.EQUAL, value: matched.employee.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the position relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createPositionAssignment({ organization });
            await suite.fixtures().createPositionAssignment({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { position: { operator: PublicLinkOperator.EQUAL, value: matched.position.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createPositionAssignment({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createPositionAssignment({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createPositionAssignment({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
