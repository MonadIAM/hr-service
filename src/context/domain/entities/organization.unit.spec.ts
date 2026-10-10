import { describe, it, expect } from "@jest/globals";

import { Organization } from "./organization.entity";

describe("[Entity] - Organization", () => {
    describe("[Method] - constructor", () => {
        it("[case] - preserves the supplied organization and realm identifiers", () => {
            // Arrange

            // Act
            const entity = new Organization({ id: "organization", realm: "realm" });

            // Assert
            expect(entity.id).toBe("organization");
            expect(entity.realm).toBe("realm");
        });
    });
});
