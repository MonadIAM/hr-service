import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { Validator } from "~common/validator";

import { WorkCalendarDTO } from "./entity.dto";

@ApiSchema({ name: "WorkCalendarListMeta" })
class WorkCalendarListMetaDTO {
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

@ApiSchema({ name: "WorkCalendarList" })
export class ListDTO {
    @Expose()
    @Validator.IsArray()
    @Validator.ValidateNested({ each: true })
    @Type(() => WorkCalendarDTO)
    @ApiProperty({ required: true, type: [WorkCalendarDTO] })
    declare public data: WorkCalendarDTO[];

    @Expose()
    @Validator.IsOptional()
    @Validator.ValidateNested()
    @Type(() => WorkCalendarListMetaDTO)
    @ApiProperty({ required: false, type: WorkCalendarListMetaDTO })
    declare public meta?: WorkCalendarListMetaDTO;
}
