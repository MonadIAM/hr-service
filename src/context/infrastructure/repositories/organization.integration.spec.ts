import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";

import { OrganizationRepository } from "./organization.repository";

describe("OrganizationRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new OrganizationRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads the organization projection and its realm", async () => {
            const organization = await suite.fixtures().createOrganization();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: organization.id } });

            expect(loaded).toMatchObject({
                id: organization.id,
                realm: organization.realm,
            });
        });
    });

    describe("findMany", () => {
        it("filters organization projections by realm", async () => {
            const matched = await suite.fixtures().createOrganization();
            await suite.fixtures().createOrganization();

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { realm: { operator: PublicLinkOperator.EQUAL, value: matched.realm } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters organization projections by id", async () => {
            const matched = await suite.fixtures().createOrganization();
            await suite.fixtures().createOrganization();

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: {
                    id: { operator: PublicStringOperator.EQUAL, value: matched.id },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("returns no projections for an unknown realm", async () => {
            await suite.fixtures().createOrganization();
            const realm = randomUUID();

            const list = suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { realm: { operator: PublicLinkOperator.EQUAL, value: realm } },
            });

            await expect(list).resolves.toEqual([[], 0]);
        });
    });
});
