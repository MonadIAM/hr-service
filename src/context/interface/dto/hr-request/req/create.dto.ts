import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { HRRequestType } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequestCreateBody" })
export class CreateBodyDTO {
    @Expose()
    @Validator.IsNumber()
    @ApiProperty({ required: true })
    declare public payloadSchemaVersion: number;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public initiatorEmployee?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public relatedRequest?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public targetPosition?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public idempotencyKey: string;

    @Expose()
    @Validator.IsObject()
    @ApiProperty({ required: true, type: Object })
    declare public payload: UnknownObject;

    @Expose()
    @Validator.IsEnum(HRRequestType)
    @ApiProperty({ required: true })
    declare public type: HRRequestType;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false })
    declare public effectiveAt?: Date;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public employee: string;
}

@ApiSchema({ name: "HRRequestCreateQuery" })
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
