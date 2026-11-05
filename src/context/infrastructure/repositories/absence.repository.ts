import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";
import { raw } from "@mikro-orm/postgresql";

import { AbsenceStatus } from "~context/enums";
import { Absence } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { AbsenceMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class AbsenceRepository
    extends BaseRepository<Entities.Absence, Repositories.Mappers.Absence.Types>({
        Mapper: AbsenceMapper,
        Entity: Absence,
    })
    implements Repositories.Absence.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }

    public async findDue(props: Repositories.Absence.FindDue.Props): Repositories.Absence.FindDue.Result {
        return await this.find({
            options: { orderBy: { createdAt: "ASC", id: "ASC" }, limit: props.limit },
            where: {
                $or: [
                    {
                        [raw(
                            (alias) =>
                                `coalesce(${alias}.starts_at, ${alias}.start_date::timestamp at time zone ${alias}.timezone)`,
                        )]: { $lte: props.at },
                        status: AbsenceStatus.SCHEDULED,
                    },
                    {
                        [raw(
                            (alias) =>
                                `coalesce(${alias}.ends_at, ${alias}.end_date::timestamp at time zone ${alias}.timezone)`,
                        )]: { $lte: props.at },
                        status: AbsenceStatus.IN_PROGRESS,
                    },
                ],
            },
        });
    }
}
