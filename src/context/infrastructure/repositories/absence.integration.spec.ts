import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { AbsenceStatus, LeaveUnit } from "~context/enums";

import { AbsenceRepository } from "./absence.repository";

describe("AbsenceRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new AbsenceRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("loads persisted fields and relations through the schema", async () => {
            const entity = await suite.fixtures().createAbsence();

            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: entity.id } });

            expect(loaded).toMatchObject({
                id: entity.id,
                createdAt: entity.createdAt,
                status: AbsenceStatus.SCHEDULED,
                unit: LeaveUnit.DAY,
                startDate: "2026-07-01",
                endDate: "2026-07-06",
                quantity: "5.000000",
                poolCode: "ANNUAL",
                timezone: "Europe/London",
                calculationSnapshot: { days: 5 },
            });
            expect(loaded.organization.id).toBe(entity.organization.id);
            expect(loaded.employee.id).toBe(entity.employee.id);
            expect(loaded.sourceRequest.id).toBe(entity.sourceRequest.id);
            expect(loaded.leavePolicy.id).toBe(entity.leavePolicy.id);
        });
    });

    describe("findMany", () => {
        it("filters by organization and status", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createAbsence({ organization });
            await suite.fixtures().createAbsence({ organization, status: AbsenceStatus.COMPLETED });
            await suite.fixtures().createAbsence({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    status: { operator: PublicStringOperator.EQUAL, value: AbsenceStatus.SCHEDULED },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by organization and quantity", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createAbsence({ organization });
            await suite.fixtures().createAbsence({ organization, quantity: "3.000000" });
            await suite.fixtures().createAbsence({});

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    organization: { operator: PublicLinkOperator.EQUAL, value: organization.id },
                    quantity: { operator: PublicOrdinalOperator.EQUAL, value: "5" },
                },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the employee relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createAbsence({ organization });
            await suite.fixtures().createAbsence({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { employee: { operator: PublicLinkOperator.EQUAL, value: matched.employee.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the sourceRequest relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createAbsence({ organization });
            await suite.fixtures().createAbsence({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { sourceRequest: { operator: PublicLinkOperator.EQUAL, value: matched.sourceRequest.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("filters by the leavePolicy relation", async () => {
            const organization = await suite.fixtures().createOrganization();
            const matched = await suite.fixtures().createAbsence({ organization });
            await suite.fixtures().createAbsence({ organization });

            const [entries, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: {},
                filters: { leavePolicy: { operator: PublicLinkOperator.EQUAL, value: matched.leavePolicy.id } },
            });

            expect(total).toBe(1);
            expect(entries.map(({ id }) => id)).toEqual([matched.id]);
        });

        it("sorts and paginates while preserving the total count", async () => {
            const organization = await suite.fixtures().createOrganization();
            const first = await suite
                .fixtures()
                .createAbsence({ organization, createdAt: new Date("2026-01-01T00:00:00Z") });
            await suite.fixtures().createAbsence({ organization, createdAt: new Date("2026-01-02T00:00:00Z") });
            await suite.fixtures().createAbsence({ organization, createdAt: new Date("2026-01-03T00:00:00Z") });

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
