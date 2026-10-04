import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Organization } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { OrganizationMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class OrganizationRepository
    extends BaseRepository<Entities.Organization, Repositories.Mappers.Organization.Types>({
        Mapper: OrganizationMapper,
        Entity: Organization,
    })
    implements Repositories.Organization.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
