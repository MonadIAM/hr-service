import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { HRDecisionKind } from "~context/enums";

import { HRApprovalDecisionRepository } from "./hr-approval-decision.repository";

describe("HRApprovalDecisionRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new HRApprovalDecisionRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createHRApprovalDecision();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                decision: HRDecisionKind.APPROVE,
                requestRevision: 1,
                actorAccount: entity.actorAccount,
                request: entity.request,
                comment: "Approved",
                decidedAt: new Date("2026-01-02T10:00:00Z"),
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
            expect(loaded.step.id).toBe(entity.step.id);
            expect(loaded.actorEmployee.id).toBe(entity.actorEmployee.id);
        });
    });

    describe("findMany", () => {
        it("filters by organization and decision", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalDecision({ organization });
            await suite.fixtures().createHRApprovalDecision({ organization, decision: HRDecisionKind.REJECT });
            await suite.fixtures().createHRApprovalDecision({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    decision: { operator: PublicStringOperator.EQUAL, value: HRDecisionKind.APPROVE },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and requestRevision", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalDecision({ organization });
            await suite.fixtures().createHRApprovalDecision({
                organization,
                step: await suite.fixtures().createHRApprovalStep({ organization, requestRevision: 2 }),
            });
            await suite.fixtures().createHRApprovalDecision({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    requestRevision: { operator: PublicOrdinalOperator.EQUAL, value: 1 },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the step relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalDecision({ organization });
            await suite.fixtures().createHRApprovalDecision({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { step: { operator: PublicLinkOperator.EQUAL, value: matched.step.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the actorEmployee relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createHRApprovalDecision({ organization });
            await suite.fixtures().createHRApprovalDecision({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { actorEmployee: { operator: PublicLinkOperator.EQUAL, value: matched.actorEmployee.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createHRApprovalDecision({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createHRApprovalDecision({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createHRApprovalDecision({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
