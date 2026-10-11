import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { EmploymentUnitHelpers } from "~testing/unit/domain-service/employment.helpers";

const helpers = new EmploymentUnitHelpers();

describe("[DomainService] - Employment", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it("[case] - persists an immutable snapshot of previous terms", () => {
            // Arrange
            const { service, transaction } = helpers.service();
            const input = helpers.createEmployment();

            // Act
            const result = service.create({
                organization: input.organization,
                input,
                transaction: transaction.entityManager,
            });

            // Assert
            expect(result).toMatchObject({
                employee: input.employee,
                termsRevision: 1,
                validFrom: input.validFrom,
                validTo: input.validTo,
                termsSnapshot: input.termsSnapshot,
            });
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });

        it("[case] - rejects history belonging to another organization before persistence", () => {
            // Arrange
            const { service, transaction } = helpers.service();
            const input = helpers.createEmployment();
            input.employee = helpers.createEmployee();

            // Act
            const action = (): Entities.Employment =>
                service.create({ organization: input.organization, input, transaction: transaction.entityManager });

            // Assert
            expect(action).toThrow("entities.employment.ORGANIZATION_MISMATCH");
            expect(transaction.persist).not.toHaveBeenCalled();
        });
    });
});
