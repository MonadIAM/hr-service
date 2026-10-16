import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "WorkCalendarCreateBody" })
export class CreateBodyDTO {
    @Expose()
    @Validator.IsArray()
    @ApiProperty({ required: true })
    declare public holidays: Entities.WorkCalendar.Holiday[];

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public verifiedThrough?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public countryCode: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public regionCode?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public code: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public name: string;
}

@ApiSchema({ name: "WorkCalendarCreateQuery" })
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
