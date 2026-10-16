import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { PayPeriod } from "~context/enums";

@ApiSchema({ name: "PositionCreateBody" })
export class CreateBodyDTO {
    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(PayPeriod)
    @ApiProperty({ required: false })
    declare public budgetPeriod?: PayPeriod;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public budgetCurrency?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public budgetAmount?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public requirements?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public description?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public department: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public plannedFte: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public grade?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public title: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public team: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public code: string;
}

@ApiSchema({ name: "PositionCreateQuery" })
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
