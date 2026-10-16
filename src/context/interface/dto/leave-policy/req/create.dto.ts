import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "LeavePolicyCreateBody" })
export class CreateBodyDTO {
    @Expose()
    @Validator.IsArray()
    @ApiProperty({ required: true })
    declare public rules: Entities.LeavePolicy.Rule[];

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public jurisdiction: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public code: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public name: string;
}

@ApiSchema({ name: "LeavePolicyCreateQuery" })
export class CreateQueryDTO {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public organization: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public realm: string;
}
