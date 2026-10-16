import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { DayOverride } from "~context/enums";

@ApiSchema({ name: "WorkCalendarExceptionCreateBody" })
export class CreateBodyDTO {
    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(DayOverride)
    @ApiProperty({ required: false })
    declare public workdayOverride?: DayOverride;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsNumber()
    @ApiProperty({ required: false })
    declare public shortenedByMinutes?: number;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsBoolean()
    @ApiProperty({ required: false })
    declare public holidayOverride?: boolean;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public calendar: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public source?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public name?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public date: string;
}

@ApiSchema({ name: "WorkCalendarExceptionCreateQuery" })
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
