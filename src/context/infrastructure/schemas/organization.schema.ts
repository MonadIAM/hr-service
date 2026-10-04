import { EntitySchema } from "@mikro-orm/core";

import { Organization } from "~context/domain/entities";

export const OrganizationSchema = new EntitySchema<Organization>({
    class: Organization,
    tableName: "organization",
    schema: "hr",

    uniques: [
        {
            name: "organization_realm_unique",
            properties: ["realm"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },
        realm: { type: "uuid", fieldName: "realm_id" },
    },
});
