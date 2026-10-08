import { describe, it, expect } from "@jest/globals";

import { Organization } from "./organization.entity";

describe("Organization Entity", () => {
    describe("constructor", () => {
        it("should preserve the supplied organization and realm identifiers", () => {
            const entity = new Organization({ id: "organization", realm: "realm" });

            expect(entity.id).toBe("organization");
            expect(entity.realm).toBe("realm");
        });
    });
});
