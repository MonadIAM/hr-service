import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";

import { EmploymentRepository } from "./employment.repository";

describe("EmploymentRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new EmploymentRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createEmployment();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                validFrom: "2026-01-01",
                validTo: "2026-07-01",
                termsRevision: 1,
                termsSnapshot: { contractType: "permanent", salary: "5000.00" },
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
            expect(loaded.employee.id).toBe(entity.employee.id);
        });
    });

    describe("findMany", () => {
        it("filters by organization and termsRevision", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createEmployment({ organization });
            await suite.fixtures().createEmployment({ organization, termsRevision: 2 });
            await suite.fixtures().createEmployment({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    termsRevision: { operator: PublicOrdinalOperator.EQUAL, value: 1 },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and validFrom", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createEmployment({ organization });
            await suite.fixtures().createEmployment({ organization, validFrom: "2026-02-01" });
            await suite.fixtures().createEmployment({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    validFrom: { operator: PublicOrdinalOperator.EQUAL, value: "2026-01-01" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the employee relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createEmployment({ organization });
            await suite.fixtures().createEmployment({ organization });

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
                .createEmployment({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createEmployment({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createEmployment({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
