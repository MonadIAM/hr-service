import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { DayOverride } from "~context/enums";

@ApiSchema({ name: "WorkCalendarException" })
export class WorkCalendarExceptionDTO {
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
    @Validator.IsOptional()
    @Validator.IsEnum(DayOverride)
    @ApiProperty({ required: false, type: Object })
    declare public workdayOverride?: DayOverride;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsInt()
    @ApiProperty({ required: false, type: Number })
    declare public shortenedByMinutes?: number;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsBoolean()
    @ApiProperty({ required: false, type: Boolean })
    declare public holidayOverride?: boolean;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false, type: String })
    declare public source?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false, type: String })
    declare public name?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public date: string;
}
