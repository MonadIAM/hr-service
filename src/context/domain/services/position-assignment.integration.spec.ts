import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { PositionAssignmentIntegrationHelpers } from "~testing/integration/domain-service/position-assignment.helpers";
import { EmployeeStatus, PositionAssignmentStatus, RecordStatus } from "~context/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { Position, PositionAssignment } from "~context/domain/entities";

const helpers = new PositionAssignmentIntegrationHelpers();

describe("[DomainService] - PositionAssignment", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - transfer", () => {
        it.each([true, false])(
            "[case] - commits or rolls back the flushed previous assignment (target active: %s)",
            async (active) => {
                // Arrange
                const employee = await suite.fixtures().createEmployee({ status: EmployeeStatus.ACTIVE });
                const previous = await suite.fixtures().createPositionAssignment({ employee });
                const target = await suite.fixtures().createPosition({
                    organization: employee.organization,
                    title: "New placement",
                    status: active ? RecordStatus.ACTIVE : RecordStatus.ARCHIVED,
                });
                await suite.transaction(async (transaction) => {
                    const position = await transaction.findOneOrFail(Position, { id: target.id });
                    position.completePlacement(false);
                });

                // Act
                const result = suite.transaction((transaction) =>
                    suite.repository().service.transfer({
                        organization: employee.organization.id,
                        id: previous.id,
                        transaction,
                        input: { employee: employee.id, position: target.id, validFrom: "2026-07-01", fte: "1" },
                    }),
                );

                // Assert
                if (active) {
                    await expect(result).resolves.toMatchObject({ positionTitle: "New placement" });
                } else {
                    await expect(result).rejects.toThrow("entities.position-assignment.INACTIVE_REFERENCE");
                }
                const persisted = await suite.transaction((transaction) =>
                    transaction.findOneOrFail(PositionAssignment, { id: previous.id }),
                );
                expect(persisted.status).toBe(active ? PositionAssignmentStatus.CLOSED : PositionAssignmentStatus.ACTIVE);
                expect(persisted.validTo ?? undefined).toBe(active ? "2026-07-01" : undefined);
                expect(
                    await suite.transaction((transaction) =>
                        transaction.count(PositionAssignment, { employee: { id: employee.id } }),
                    ),
                ).toBe(active ? 2 : 1);
            },
        );
    });

    describe("[Method] - create", () => {
        it("[case] - snapshots position fields and closes an assignment", async () => {
            // Arrange
            const employee = await suite.fixtures().createEmployee({ status: EmployeeStatus.ACTIVE });
            const position = await suite
                .fixtures()
                .createPosition({ organization: employee.organization, title: "Engineer" });
            await suite.transaction(async (transaction) => {
                (await transaction.findOneOrFail(Position, { id: position.id })).completePlacement(false);
            });

            // Act
            const created = await suite.transaction((transaction) =>
                suite.repository().service.create({
                    organization: employee.organization.id,
                    transaction,
                    input: { employee: employee.id, position: position.id, validFrom: "2026-01-01", fte: "0.5" },
                }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.close({
                    organization: employee.organization.id,
                    id: created.id,
                    validTo: "2026-07-01",
                    transaction,
                }),
            );
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(PositionAssignment, { id: created.id }),
            );

            // Assert
            expect(persisted).toMatchObject({
                positionTitle: "Engineer",
                fte: "0.5000",
                status: PositionAssignmentStatus.CLOSED,
                validTo: "2026-07-01",
            });
            expect(persisted.placementSnapshot).toMatchObject({ title: position.title, department: position.department });
        });

        it("[case] - rejects a position belonging to another organization", async () => {
            // Arrange
            const employee = await suite.fixtures().createEmployee({ status: EmployeeStatus.ACTIVE });
            const position = await suite.fixtures().createPosition({ code: randomUUID() });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.create({
                    organization: employee.organization.id,
                    transaction,
                    input: { employee: employee.id, position: position.id, validFrom: "2026-01-01", fte: "1" },
                }),
            );

            // Assert
            await expect(result).rejects.toThrow();
            expect(await suite.transaction((transaction) => transaction.count(PositionAssignment, {}))).toBe(0);
        });
    });
});
