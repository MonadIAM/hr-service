import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { PositionIntegrationHelpers } from "~testing/integration/domain-service/position.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { Position, PositionAssignment } from "~context/domain/entities";
import { PositionAssignmentStatus, RecordStatus } from "~context/enums";

const helpers = new PositionIntegrationHelpers();

describe("[DomainService] - Position", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - archive", () => {
        it.each(["2000-01-01", "2999-01-01"])("[case] - archives an assignment starting on %s", async (validFrom) => {
            // Arrange
            const position = await suite.fixtures().createPosition();
            await suite.transaction(async (transaction) => {
                (await transaction.findOneOrFail(Position, { id: position.id })).completePlacement(false);
            });
            const assignment = await suite
                .fixtures()
                .createPositionAssignment({ organization: position.organization, position, validFrom });

            // Act
            await suite.transaction((transaction) =>
                suite
                    .repository()
                    .service.archive({ organization: position.organization.id, id: position.id, transaction }),
            );
            const persistedPosition = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Position, { id: position.id }),
            );
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(PositionAssignment, { id: assignment.id }),
            );

            // Assert
            expect(persistedPosition.status).toBe(RecordStatus.ARCHIVED);
            if (validFrom === "2000-01-01") {
                expect(persisted.status).toBe(PositionAssignmentStatus.CLOSED);
                expect(persisted.validTo).toBe(new Date().toISOString().slice(0, 10));
            } else {
                expect(persisted.status).toBe(PositionAssignmentStatus.VOIDED);
            }
        });
    });

    describe("[Method] - completePlacement", () => {
        it.each([true, false])(
            "[case] - applies a placement response only for the matching process (rejected: %s)",
            async (rejected) => {
                // Arrange
                const position = await suite.fixtures().createPosition();
                const input = {
                    organization: position.organization.id,
                    position: position.id,
                    department: position.department,
                    team: position.team,
                    process: position.process!,
                };

                // Act
                await suite.transaction((transaction) =>
                    suite.repository().service.completePlacement({
                        realm: position.organization.realm,
                        actor: randomUUID(),
                        input: { ...input, process: randomUUID() },
                        rejected,
                        transaction,
                    }),
                );
                const untouched = await suite.transaction((transaction) =>
                    transaction.findOneOrFail(Position, { id: position.id }),
                );
                await suite.transaction((transaction) =>
                    suite.repository().service.completePlacement({
                        realm: position.organization.realm,
                        actor: randomUUID(),
                        input,
                        rejected,
                        transaction,
                    }),
                );
                const persisted = await suite.transaction((transaction) =>
                    transaction.findOne(Position, { id: position.id }),
                );

                // Assert
                expect(untouched.process).toBe(position.process);
                if (rejected) {
                    expect(persisted).toBeNull();
                } else {
                    expect(persisted?.process).toBeFalsy();
                }
            },
        );
    });

    describe("[Method] - purgeDepartment", () => {
        it("[case] - removes only the matching department within the organization and realm", async () => {
            // Arrange
            const position = await suite.fixtures().createPosition();
            const otherDepartment = await suite.fixtures().createPosition({ organization: position.organization });
            const otherOrganization = await suite.fixtures().createPosition({ department: position.department });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.purgeDepartment({
                    realm: position.organization.realm,
                    actor: randomUUID(),
                    input: { organization: position.organization.id, department: position.department },
                    transaction,
                }),
            );

            // Assert
            const remaining = await suite.transaction((transaction) => transaction.find(Position, {}));
            expect(remaining.map((entity) => entity.id).sort()).toEqual([otherDepartment.id, otherOrganization.id].sort());
        });
    });
});
