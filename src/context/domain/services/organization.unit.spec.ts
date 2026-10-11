import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { OrganizationUnitHelpers } from "~testing/unit/domain-service/organization.helpers";

const helpers = new OrganizationUnitHelpers();

describe("[DomainService] - Organization", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - bootstrap", () => {
        it.each(["missing", "existing", "mismatch"])("[case] - handles %s organizations idempotently", async (state) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createOrganization();
            repositories.organization.findUnique.mockResolvedValue(state === "missing" ? undefined : entity);
            const realm = state === "mismatch" ? "another-realm" : entity.realm;

            // Act
            const result = service.bootstrap({
                transaction: transaction.entityManager,
                actor: "actor",
                realm,
                input: { resource: entity.id, process: "process", owner: "owner", name: "Organization" },
            });

            // Assert
            expect(repositories.organization.findUnique).toHaveBeenCalledWith({
                where: { id: entity.id },
                transaction: transaction.entityManager,
            });
            if (state === "mismatch") {
                await expect(result).rejects.toThrow("services.organization.REALM_MISMATCH");
            } else {
                await expect(result).resolves.toBeUndefined();
            }
            if (state === "missing") {
                expect(transaction.persist).toHaveBeenCalledWith(expect.objectContaining({ id: entity.id, realm }));
            } else {
                expect(transaction.persist).not.toHaveBeenCalled();
            }
        });
    });

    describe("[Method] - purge", () => {
        it.each([true, false])("[case] - removes only an existing organization (exists: %s)", async (exists) => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            const entity = helpers.createOrganization();
            repositories.organization.findUnique.mockResolvedValue(exists ? entity : undefined);

            // Act
            await service.purge({ transaction: transaction.entityManager, realm: entity.realm });

            // Assert
            expect(repositories.organization.findUnique).toHaveBeenCalledWith({
                where: { realm: entity.realm },
                transaction: transaction.entityManager,
            });
            if (exists) {
                expect(transaction.remove).toHaveBeenCalledWith(entity);
            } else {
                expect(transaction.remove).not.toHaveBeenCalled();
            }
        });
    });
});
