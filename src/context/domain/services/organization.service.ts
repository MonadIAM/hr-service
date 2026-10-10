import { Injectable, Inject, Scope } from "@nestjs/common";

import { ORGANIZATION_REPOSITORY } from "~context/infrastructure/repositories";
import { Exception } from "~common/exceptions";

import { Organization } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class OrganizationService implements Services.Organization.Contract {
    private readonly dictionaryPath = "services.organization";

    public constructor(
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
    ) {}

    public async bootstrap(props: Services.Organization.Bootstrap.Props): Services.Organization.Bootstrap.Result {
        const { transaction, input, realm } = props;
        const organization = await this.organizationRepository.findUnique({
            where: { id: input.resource },
            transaction,
        });

        if (organization) {
            if (organization.realm !== realm) {
                throw Exception.conflict({ messageKey: `${this.dictionaryPath}.REALM_MISMATCH` });
            }
        } else {
            const entity = new Organization({ id: input.resource, realm });
            transaction.persist(entity);
        }
    }

    public async purge(props: Services.Organization.Purge.Props): Services.Organization.Purge.Result {
        const { transaction, realm } = props;
        const organization = await this.organizationRepository.findUnique({
            where: { realm },
            transaction,
        });

        if (organization) {
            transaction.remove(organization);
        }
    }
}
