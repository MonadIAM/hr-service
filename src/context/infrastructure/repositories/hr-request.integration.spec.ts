import { LockMode, QueryOrder } from "@mikro-orm/postgresql";
import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator, PublicOrdinalOperator } from "~infrastructure/database/enums";
import { HRRequestType, HRRequestStatus, HRExecutionStatus, LeaveUnit } from "~context/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { Employee, HRRequest, Organization } from "~context/domain/entities";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";

import { HRRequestRepository } from "./hr-request.repository";

describe("[Repository] - HRRequest", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new HRRequestRepository(readManager),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Behavior] - request locking", () => {
        it.each(["findUnique", "findUniqueOrThrow", "find", "findMany"] as const)(
            "[case] - %s locks the request without locking its organization or employee",
            async (method) => {
                // Arrange
                const employee = await suite.fixtures().createEmployee({ account: randomUUID() });
                const request = await suite.fixtures().createHRRequest({ organization: employee.organization, employee });
                const other = await suite.fixtures().createHRRequest({ organization: employee.organization, employee });

                // Act
                await suite.transaction(async (transaction) => {
                    await suite.repository()[method]({
                        where: {
                            organization: { id: employee.organization.id, realm: employee.organization.realm },
                            employee: { account: employee.account },
                            id: request.id,
                        },
                        options: {
                            populate: ["organization", "employee"],
                            lockMode: LockMode.PESSIMISTIC_WRITE,
                            strategy: "select-in",
                            refresh: true,
                        },
                        transaction,
                    });
                    const concurrent = transaction.fork({ useContext: false });
                    await concurrent.begin();

                    try {
                        // Assert
                        const organization = await concurrent.findOneOrFail(
                            Organization,
                            { id: employee.organization.id },
                            { lockMode: LockMode.PESSIMISTIC_WRITE_OR_FAIL },
                        );
                        const loadedEmployee = await concurrent.findOneOrFail(
                            Employee,
                            { id: employee.id, organization: employee.organization.id },
                            { lockMode: LockMode.PESSIMISTIC_WRITE_OR_FAIL },
                        );
                        const otherRequest = await suite.repository().findUniqueOrThrow({
                            where: {
                                organization: { id: employee.organization.id, realm: employee.organization.realm },
                                employee: { account: employee.account },
                                id: other.id,
                            },
                            options: { lockMode: LockMode.PESSIMISTIC_WRITE_OR_FAIL },
                            transaction: concurrent,
                        });

                        expect(organization.id).toBe(employee.organization.id);
                        expect(loadedEmployee.id).toBe(employee.id);
                        expect(otherRequest.id).toBe(other.id);
                        await expect(
                            concurrent.findOneOrFail(
                                HRRequest,
                                { id: request.id },
                                { lockMode: LockMode.PESSIMISTIC_WRITE_OR_FAIL },
                            ),
                        ).rejects.toThrow();
                    } finally {
                        await concurrent.rollback();
                    }
                });
            },
        );
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
                payload: { startDate: "2026-07-01", endDate: "2026-07-06", poolCode: "ANNUAL", unit: LeaveUnit.DAY },
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
        it.each(["employee", "organization"] as const)(
            "[case] - cannot replace ownership constraints with a client %s filter",
            async (field) => {
                // Arrange
                const employee = await suite.fixtures().createEmployee({ account: randomUUID() });
                const owned = await suite.fixtures().createHRRequest({ organization: employee.organization, employee });
                const foreign = await suite.fixtures().createHRRequest({
                    organization: field === "employee" ? owned.organization : undefined,
                });

                // Act
                const [entries, total] = await suite.repository().findMany({
                    pagination: { currentPage: 1, elementsPerPage: 10 },
                    prefilter: {
                        $and: [
                            { organization: { realm: owned.organization.realm, id: owned.organization.id } },
                            { employee: { account: owned.employee.account } },
                        ],
                    },
                    filters: {
                        [field]: { operator: PublicLinkOperator.EQUAL, value: foreign[field].id },
                    },
                    sort: {},
                });

                // Assert
                expect(entries).toEqual([]);
                expect(total).toBe(0);
            },
        );

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
