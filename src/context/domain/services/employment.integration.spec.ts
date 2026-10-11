import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { EmploymentIntegrationHelpers } from "~testing/integration/domain-service/employment.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { Employment } from "~context/domain/entities";

const helpers = new EmploymentIntegrationHelpers();

describe("[DomainService] - Employment", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - create", () => {
        it("[case] - stores historical terms with their employee reference", async () => {
            // Arrange
            const employee = await suite.fixtures().createEmployee();

            // Act
            const created = await suite.transaction((transaction) => {
                const entity = suite.repository().service.create({
                    organization: employee.organization,
                    transaction,
                    input: {
                        employee,
                        termsRevision: 1,
                        validFrom: "2026-01-01",
                        validTo: "2026-07-01",
                        termsSnapshot: { contractType: "permanent" },
                    },
                });
                return Promise.resolve(entity);
            });
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Employment, { id: created.id }),
            );

            // Assert
            expect(persisted).toMatchObject({
                termsRevision: 1,
                validFrom: "2026-01-01",
                validTo: "2026-07-01",
                termsSnapshot: { contractType: "permanent" },
            });
            expect(persisted.employee.id).toBe(employee.id);
        });

        it("[case] - rejects another snapshot for the same employee revision", async () => {
            // Arrange
            const existing = await suite.fixtures().createEmployment();

            // Act
            const result = suite.transaction((transaction) => {
                const entity = suite.repository().service.create({
                    organization: existing.organization,
                    transaction,
                    input: { ...existing, termsSnapshot: { marker: randomUUID() } },
                });
                return Promise.resolve(entity);
            });

            // Assert
            await expect(result).rejects.toThrow();
            expect(
                await suite.transaction((transaction) =>
                    transaction.count(Employment, { employee: { id: existing.employee.id } }),
                ),
            ).toBe(1);
        });
    });
});
