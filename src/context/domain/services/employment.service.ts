import { Injectable, Scope } from "@nestjs/common";

import { Employment } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class EmploymentService implements Services.Employment.Contract {
    public create(props: Services.Employment.Create.Props): Services.Employment.Create.Result {
        const { transaction, organization, input } = props;

        const entity = new Employment({ ...input, organization });

        entity.canCreate();

        transaction.persist(entity);

        return entity;
    }
}
