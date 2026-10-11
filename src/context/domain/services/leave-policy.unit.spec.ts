import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { LockMode } from "@mikro-orm/core";

import { LeavePolicyUnitHelpers } from "~testing/unit/domain-service/leave-policy.helpers";
import { RecordStatus } from "~context/enums";

const helpers = new LeavePolicyUnitHelpers();

describe("[DomainService] - LeavePolicy", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it("[case] - persists an active record in the resolved organization", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createLeavePolicy();
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
                revision: 1,
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
            const entity = helpers.createLeavePolicy({ status: before });

            repositories.leavePolicy.findUniqueOrThrow.mockResolvedValue(entity);

            // Act
            const result = await service[method]({
                id: entity.id,
                organization: entity.organization.id,
                transaction: transaction.entityManager,
            });

            // Assert
            expect(result).toBe(entity);
            expect(entity.status).toBe(after);
            expect(repositories.leavePolicy.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { id: entity.id, organization: entity.organization.id },
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
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
                const entity = helpers.createLeavePolicy({ status });

                repositories.leavePolicy.findUniqueOrThrow.mockResolvedValue(entity);

                // Act
                const result = service.purge({
                    id: entity.id,
                    organization: entity.organization.id,
                    transaction: transaction.entityManager,
                });

                // Assert
                if (status === RecordStatus.ACTIVE) {
                    await expect(result).rejects.toThrow("entities.leave-policy.CANNOT_PURGE_ACTIVE");
                    expect(transaction.remove).not.toHaveBeenCalled();
                } else {
                    await expect(result).resolves.toBe(entity);
                    expect(transaction.remove).toHaveBeenCalledWith(entity);
                }
            },
        );
    });

    describe("[Method] - createRevision", () => {
        it("[case] - persists the next revision without changing the original", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createLeavePolicy();
            repositories.leavePolicy.findUniqueOrThrow.mockResolvedValue(entity);
            repositories.leavePolicy.find.mockResolvedValue([entity]);

            // Act
            const result = await service.createRevision({
                id: entity.id,
                organization: entity.organization.id,
                transaction: transaction.entityManager,
                input: { name: "Updated" },
            });

            // Assert
            expect(result).toMatchObject({
                name: "Updated",
                revision: 2,
                code: entity.code,
                organization: entity.organization,
            });
            expect(entity.revision).toBe(1);
            expect(entity.name).not.toBe("Updated");
            expect(transaction.persist).toHaveBeenCalledWith(result);
            expect(repositories.leavePolicy.find).toHaveBeenCalledWith({
                where: { code: entity.code, organization: entity.organization.id },
                options: { orderBy: { revision: "DESC" }, fields: ["id"], limit: 1 },
                transaction: transaction.entityManager,
            });
        });

        it.each([false, true])("[case] - rejects a stale or missing latest revision (missing: %s)", async (missing) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createLeavePolicy();
            repositories.leavePolicy.findUniqueOrThrow.mockResolvedValue(entity);
            repositories.leavePolicy.find.mockResolvedValue(
                missing
                    ? []
                    : [helpers.createLeavePolicy({ organization: entity.organization, code: entity.code, revision: 2 })],
            );

            // Act
            const result = service.createRevision({
                id: entity.id,
                organization: entity.organization.id,
                transaction: transaction.entityManager,
                input: { name: "Updated" },
            });

            // Assert
            await expect(result).rejects.toThrow("services.leave-policy.STALE_REVISION");
            expect(transaction.persist).not.toHaveBeenCalled();
        });
    });
});
