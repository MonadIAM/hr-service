import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { LockMode } from "@mikro-orm/core";

import { PositionAssignmentStatus, PositionReferenceType, RecordStatus } from "~context/enums";
import { PositionUnitHelpers } from "~testing/unit/domain-service/position.helpers";

const helpers = new PositionUnitHelpers();

describe("[DomainService] - Position", () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    describe("[Method] - archive", () => {
        it("[case] - closes current assignments and voids future assignments", async () => {
            // Arrange
            jest.useFakeTimers({ now: new Date("2026-07-01T12:00:00Z") });
            const { service, repositories, transaction } = helpers.service();
            const position = helpers.createPosition();
            position.completePlacement(false);
            const current = helpers.createPositionAssignment({ position, validFrom: "2026-07-01" });
            const future = helpers.createPositionAssignment({ position, validFrom: "2026-07-02" });
            repositories.position.findUniqueOrThrow.mockResolvedValue(position);
            repositories.positionAssignment.find.mockResolvedValue([current, future]);

            // Act
            await service.archive({
                organization: position.organization.id,
                id: position.id,
                transaction: transaction.entityManager,
            });

            // Assert
            expect(current).toMatchObject({ status: PositionAssignmentStatus.CLOSED, validTo: "2026-07-01" });
            expect(future.status).toBe(PositionAssignmentStatus.VOIDED);
            expect(repositories.positionAssignment.find).toHaveBeenCalledWith({
                where: {
                    position: { id: position.id },
                    organization: position.organization.id,
                    status: PositionAssignmentStatus.ACTIVE,
                },
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
                transaction: transaction.entityManager,
            });
        });
    });

    describe("[Method] - completePlacement", () => {
        it.each(["missing", "accepted", "rejected-new", "rejected-restored"])(
            "[case] - handles a %s placement response",
            async (state) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const entity = helpers.createPosition();
                if (state === "rejected-restored") {
                    entity.previousStatus = RecordStatus.ARCHIVED;
                }
                const input = {
                    organization: entity.organization.id,
                    position: entity.id,
                    department: entity.department,
                    team: entity.team,
                    process: entity.process!,
                };
                repositories.position.findUnique.mockResolvedValue(state === "missing" ? undefined : entity);

                // Act
                await service.completePlacement({
                    actor: "actor",
                    realm: entity.organization.realm,
                    rejected: state.startsWith("rejected"),
                    input,
                    transaction: transaction.entityManager,
                });

                // Assert
                expect(repositories.position.findUnique).toHaveBeenCalledWith({
                    where: {
                        id: entity.id,
                        organization: { id: entity.organization.id, realm: entity.organization.realm },
                        process: input.process,
                    },
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
                    transaction: transaction.entityManager,
                });
                if (state === "rejected-new") {
                    expect(transaction.remove).toHaveBeenCalledWith(entity);
                } else {
                    expect(transaction.remove).not.toHaveBeenCalled();
                    if (state !== "missing") {
                        expect(entity.process).toBeUndefined();
                    }
                    if (state === "rejected-restored") {
                        expect(entity.status).toBe(RecordStatus.ARCHIVED);
                    }
                }
            },
        );
    });

    describe("[Method] - validateReference", () => {
        it.each([PositionReferenceType.DEPARTMENT_MANAGER, PositionReferenceType.TEAM_LEAD])(
            "[case] - validates an active, ready position for %s",
            async (type) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const entity = helpers.createPosition();
                entity.completePlacement(false);
                repositories.position.findUniqueOrThrow.mockResolvedValue(entity);

                // Act
                await service.validateReference({
                    actor: "actor",
                    realm: entity.organization.realm,
                    input: {
                        type,
                        organization: entity.organization.id,
                        position: entity.id,
                        department: entity.department,
                        team: entity.team,
                        process: "process",
                    },
                    transaction: transaction.entityManager,
                });

                // Assert
                expect(repositories.position.findUniqueOrThrow).toHaveBeenCalledWith({
                    where: {
                        ...(type === PositionReferenceType.TEAM_LEAD ? { team: entity.team } : {}),
                        organization: { id: entity.organization.id, realm: entity.organization.realm },
                        department: entity.department,
                        status: RecordStatus.ACTIVE,
                        id: entity.id,
                    },
                    options: { lockMode: LockMode.PESSIMISTIC_READ, refresh: true },
                    transaction: transaction.entityManager,
                });
            },
        );
    });

    describe("[Behavior] - placement cleanup", () => {
        it.each(["purgeDepartment", "purgeTeam"] as const)(
            "[case] - scopes %s by organization and realm",
            async (method) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const entity = helpers.createPosition();
                repositories.position.find.mockResolvedValue([entity]);

                // Act
                const result = await service[method]({
                    actor: "actor",
                    realm: entity.organization.realm,
                    input: { organization: entity.organization.id, department: entity.department, team: entity.team },
                    transaction: transaction.entityManager,
                });

                // Assert
                expect(result).toEqual([entity]);
                expect(transaction.remove).toHaveBeenCalledWith([entity]);
                expect(repositories.position.find).toHaveBeenCalledWith({
                    where: {
                        organization: { id: entity.organization.id, realm: entity.organization.realm },
                        ...(method === "purgeDepartment" ? { department: entity.department } : { team: entity.team }),
                    },
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
                    transaction: transaction.entityManager,
                });
            },
        );
    });

    describe("[Method] - create", () => {
        it("[case] - persists an active record in the resolved organization", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createPosition();
            repositories.organization.findUniqueOrThrow.mockResolvedValue(entity.organization);

            // Act
            const result = await service.create({
                organization: entity.organization.id,
                transaction: transaction.entityManager,
                input: entity,
            });

            // Assert
            expect(repositories.organization.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { id: entity.organization.id },
                transaction: transaction.entityManager,
            });
            expect(result).toMatchObject({
                code: entity.code,
                organization: entity.organization,
                status: RecordStatus.ACTIVE,
            });
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });
    });

    describe("[Behavior] - lifecycle", () => {
        it.each([
            { method: "archive", before: RecordStatus.ACTIVE, after: RecordStatus.ARCHIVED },
            { method: "restore", before: RecordStatus.ARCHIVED, after: RecordStatus.ACTIVE },
        ] as const)("[case] - locks and $method records in the organization", async ({ method, before, after }) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createPosition({ status: before });
            entity.completePlacement(false);
            repositories.position.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = await service[method]({
                id: entity.id,
                organization: entity.organization.id,
                transaction: transaction.entityManager,
            });

            // Assert
            expect(result).toBe(entity);
            expect(entity.status).toBe(after);
            expect(repositories.position.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { id: entity.id, organization: entity.organization.id },
                options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
                transaction: transaction.entityManager,
            });
        });
    });

    describe("[Method] - purge", () => {
        it.each([RecordStatus.ACTIVE, RecordStatus.ARCHIVED])(
            "[case] - enforces purge eligibility for %s",
            async (status) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                const entity = helpers.createPosition({ status });
                entity.completePlacement(false);
                repositories.position.findUniqueOrThrow.mockResolvedValue(entity);

                // Act
                const result = service.purge({
                    id: entity.id,
                    organization: entity.organization.id,
                    transaction: transaction.entityManager,
                });

                // Assert
                if (status === RecordStatus.ACTIVE) {
                    await expect(result).rejects.toThrow("entities.position.CANNOT_PURGE_ACTIVE");
                    expect(transaction.remove).not.toHaveBeenCalled();
                } else {
                    await expect(result).resolves.toBe(entity);
                    expect(transaction.remove).toHaveBeenCalledWith(entity);
                }
            },
        );
    });

    describe("[Method] - update", () => {
        it("[case] - applies a patch to the locked record", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createPosition();
            entity.completePlacement(false);
            repositories.position.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = await service.update({
                id: entity.id,
                organization: entity.organization.id,
                transaction: transaction.entityManager,
                patch: { title: "Updated" },
            });

            // Assert
            expect(result).toBe(entity);
            expect(entity.title).toBe("Updated");
        });
    });
});
