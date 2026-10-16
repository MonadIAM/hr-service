import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { Validator } from "~common/validator";

import { WorkScheduleDTO } from "./entity.dto";

@ApiSchema({ name: "WorkScheduleListMeta" })
class WorkScheduleListMetaDTO {
    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public totalElements: number;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public totalPages: number;

    @Expose()
    @Validator.IsInt()
    @Validator.IsIn([10, 25, 50, 100])
    @ApiProperty({ required: true, type: Number })
    declare public elementsPerPage: number;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public currentPage: number;
}

@ApiSchema({ name: "WorkScheduleList" })
export class ListDTO {
    @Expose()
    @Validator.IsArray()
    @Validator.ValidateNested({ each: true })
    @Type(() => WorkScheduleDTO)
    @ApiProperty({ required: true, type: [WorkScheduleDTO] })
    declare public data: WorkScheduleDTO[];

    @Expose()
    @Validator.IsOptional()
    @Validator.ValidateNested()
    @Type(() => WorkScheduleListMetaDTO)
    @ApiProperty({ required: false, type: WorkScheduleListMetaDTO })
    declare public meta?: WorkScheduleListMetaDTO;
}
