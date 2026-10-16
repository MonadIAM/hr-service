import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { Validator } from "~common/validator";

import { WorkCalendarExceptionDTO } from "./entity.dto";

@ApiSchema({ name: "WorkCalendarExceptionListMeta" })
class WorkCalendarExceptionListMetaDTO {
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

@ApiSchema({ name: "WorkCalendarExceptionList" })
export class ListDTO {
    @Expose()
    @Validator.IsArray()
    @Validator.ValidateNested({ each: true })
    @Type(() => WorkCalendarExceptionDTO)
    @ApiProperty({ required: true, type: [WorkCalendarExceptionDTO] })
    declare public data: WorkCalendarExceptionDTO[];

    @Expose()
    @Validator.IsOptional()
    @Validator.ValidateNested()
    @Type(() => WorkCalendarExceptionListMetaDTO)
    @ApiProperty({ required: false, type: WorkCalendarExceptionListMetaDTO })
    declare public meta?: WorkCalendarExceptionListMetaDTO;
}
