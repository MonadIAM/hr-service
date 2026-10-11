import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { AuditLogUnitHelpers } from "~testing/unit/domain-service/audit-log.helpers";

const helpers = new AuditLogUnitHelpers();

describe("[DomainService] - AuditLog", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - purgeExpired", () => {
        it.each([0, 2])("[case] - removes and returns an expired batch of %s entries", async (count) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entries = Array.from({ length: count }, () => helpers.createAuditLog());
            const expirationDate = new Date("2026-01-01T00:00:00Z");
            repositories.auditLog.find.mockResolvedValue(entries);

            // Act
            const result = await service.purgeExpired({
                transaction: transaction.entityManager,
                expirationDate,
                batchSize: 2,
            });

            // Assert
            expect(repositories.auditLog.find).toHaveBeenCalledWith({
                where: { createdAt: { $lt: expirationDate } },
                options: { limit: 2 },
                transaction: transaction.entityManager,
            });
            expect(result).toEqual(entries);
            expect(transaction.remove).toHaveBeenCalledTimes(count);
            entries.forEach((entry, index) => expect(transaction.remove).toHaveBeenNthCalledWith(index + 1, entry));
        });
    });
});
