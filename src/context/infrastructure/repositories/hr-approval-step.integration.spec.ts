import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { HRApprovalStatus } from "~context/enums";

import { HRApprovalStepRepository } from "./hr-approval-step.repository";

describe("HRApprovalStepRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new HRApprovalStepRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createHRApprovalStep();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

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

    describe("findMany", () => {
        it("filters by organization and status", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalStep({ organization });
            await suite.fixtures().createHRApprovalStep({ organization, status: HRApprovalStatus.ACTIVE });
            await suite.fixtures().createHRApprovalStep({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    status: { operator: PublicStringOperator.EQUAL, value: HRApprovalStatus.WAITING },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and ordinal", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalStep({ organization });
            await suite.fixtures().createHRApprovalStep({ organization, ordinal: 2 });
            await suite.fixtures().createHRApprovalStep({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    ordinal: { operator: PublicOrdinalOperator.EQUAL, value: 1 },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the request relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalStep({ organization });
            await suite.fixtures().createHRApprovalStep({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { request: { operator: PublicLinkOperator.EQUAL, value: matched.request.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the assigneeEmployee relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalStep({ organization });
            await suite.fixtures().createHRApprovalStep({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { assigneeEmployee: { operator: PublicLinkOperator.EQUAL, value: matched.assigneeEmployee.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createHRApprovalStep({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createHRApprovalStep({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createHRApprovalStep({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
