import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { RecordStatus } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "LeavePolicy" })
export class LeavePolicyDTO {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public id: string;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public version: number;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: true, type: Date })
    declare public createdAt: Date;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public updatedAt?: Date;

    @Expose()
    @Validator.IsEnum(RecordStatus)
    @ApiProperty({ required: true, type: Object })
    declare public status: RecordStatus;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public jurisdiction: string;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public revision: number;

    @Expose()
    @Validator.IsArray()
    @ApiProperty({ required: true, type: Object })
    declare public rules: Entities.LeavePolicy.Rule[];

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public code: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public name: string;
}
