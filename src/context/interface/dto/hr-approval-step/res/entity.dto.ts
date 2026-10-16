import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { HRApprovalStatus } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "HRApprovalStep" })
export class HRApprovalStepDTO {
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
    @Validator.IsEnum(HRApprovalStatus)
    @ApiProperty({ required: true, type: Object })
    declare public status: HRApprovalStatus;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public requestRevision: number;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public resolvedAt?: Date;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public ordinal: number;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public name: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public dueAt?: Date;
}
