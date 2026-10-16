import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { Validator } from "~common/validator";

import { HRRequestDTO } from "./entity.dto";

@ApiSchema({ name: "HRRequestListMeta" })
class HRRequestListMetaDTO {
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

@ApiSchema({ name: "HRRequestList" })
export class ListDTO {
    @Expose()
    @Validator.IsArray()
    @Validator.ValidateNested({ each: true })
    @Type(() => HRRequestDTO)
    @ApiProperty({ required: true, type: [HRRequestDTO] })
    declare public data: HRRequestDTO[];

    @Expose()
    @Validator.IsOptional()
    @Validator.ValidateNested()
    @Type(() => HRRequestListMetaDTO)
    @ApiProperty({ required: false, type: HRRequestListMetaDTO })
    declare public meta?: HRRequestListMetaDTO;
}
