import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { CalendarApplication, SchedulePattern } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "WorkScheduleCreateBody" })
export class CreateBodyDTO {
    @Expose()
    @Validator.IsEnum(CalendarApplication)
    @ApiProperty({ required: true })
    declare public calendarApplication: CalendarApplication;

    @Expose()
    @Validator.IsObject()
    @ApiProperty({ required: true })
    declare public pattern: Entities.WorkSchedule.Pattern;

    @Expose()
    @Validator.IsEnum(SchedulePattern)
    @ApiProperty({ required: true })
    declare public patternType: SchedulePattern;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public code: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public name: string;
}

@ApiSchema({ name: "WorkScheduleCreateQuery" })
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
