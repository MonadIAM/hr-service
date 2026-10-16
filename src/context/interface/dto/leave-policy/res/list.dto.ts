import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { Validator } from "~common/validator";

import { LeavePolicyDTO } from "./entity.dto";

@ApiSchema({ name: "LeavePolicyListMeta" })
class LeavePolicyListMetaDTO {
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

@ApiSchema({ name: "LeavePolicyList" })
export class ListDTO {
    @Expose()
    @Validator.IsArray()
    @Validator.ValidateNested({ each: true })
    @Type(() => LeavePolicyDTO)
    @ApiProperty({ required: true, type: [LeavePolicyDTO] })
    declare public data: LeavePolicyDTO[];

    @Expose()
    @Validator.IsOptional()
    @Validator.ValidateNested()
    @Type(() => LeavePolicyListMetaDTO)
    @ApiProperty({ required: false, type: LeavePolicyListMetaDTO })
    declare public meta?: LeavePolicyListMetaDTO;
}
