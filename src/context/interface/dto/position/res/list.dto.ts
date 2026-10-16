import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { Validator } from "~common/validator";

import { PositionDTO } from "./entity.dto";

@ApiSchema({ name: "PositionListMeta" })
class PositionListMetaDTO {
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

@ApiSchema({ name: "PositionList" })
export class ListDTO {
    @Expose()
    @Validator.IsArray()
    @Validator.ValidateNested({ each: true })
    @Type(() => PositionDTO)
    @ApiProperty({ required: true, type: [PositionDTO] })
    declare public data: PositionDTO[];

    @Expose()
    @Validator.IsOptional()
    @Validator.ValidateNested()
    @Type(() => PositionListMetaDTO)
    @ApiProperty({ required: false, type: PositionListMetaDTO })
    declare public meta?: PositionListMetaDTO;
}
