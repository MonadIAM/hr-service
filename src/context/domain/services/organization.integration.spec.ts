import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { OrganizationIntegrationHelpers } from "~testing/integration/domain-service/organization.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { Organization, Employee } from "~context/domain/entities";

const helpers = new OrganizationIntegrationHelpers();

describe("[DomainService] - Organization", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Method] - bootstrap", () => {
        it("[case] - persists once and rejects a conflicting realm", async () => {
            // Arrange
            const realm = randomUUID();
            const input = { resource: randomUUID(), owner: randomUUID(), process: randomUUID(), name: "Organization" };

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.bootstrap({ actor: input.owner, realm, input, transaction }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.bootstrap({ actor: input.owner, realm, input, transaction }),
            );
            const result = suite.transaction((transaction) =>
                suite.repository().service.bootstrap({ actor: input.owner, realm: randomUUID(), input, transaction }),
            );

            // Assert
            await expect(result).rejects.toThrow("services.organization.REALM_MISMATCH");
            const persisted = await suite.transaction((transaction) => transaction.find(Organization, {}));
            expect(persisted).toHaveLength(1);
            expect(persisted[0]).toMatchObject({ id: input.resource, realm });
        });
    });

    describe("[Method] - purge", () => {
        it("[case] - cascades organization records and preserves another realm", async () => {
            // Arrange
            const entity = await suite.fixtures().createEmployee();
            const other = await suite.fixtures().createEmployee();

            // Act
            await suite.transaction((transaction) =>
                suite.repository().service.purge({ realm: entity.organization.realm, transaction }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.purge({ realm: entity.organization.realm, transaction }),
            );

            // Assert
            const employees = await suite.transaction((transaction) => transaction.find(Employee, {}));
            expect(employees.map((employee) => employee.id)).toEqual([other.id]);
        });
    });
});
