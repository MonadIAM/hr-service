import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { CalendarApplication, SchedulePattern, RecordStatus } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "WorkSchedule" })
export class WorkScheduleDTO {
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
    @Validator.IsEnum(CalendarApplication)
    @ApiProperty({ required: true, type: Object })
    declare public calendarApplication: CalendarApplication;

    @Expose()
    @Validator.IsEnum(SchedulePattern)
    @ApiProperty({ required: true, type: Object })
    declare public patternType: SchedulePattern;

    @Expose()
    @Validator.IsEnum(RecordStatus)
    @ApiProperty({ required: true, type: Object })
    declare public status: RecordStatus;

    @Expose()
    @Validator.IsObject()
    @ApiProperty({ required: true, type: Object })
    declare public pattern: Entities.WorkSchedule.Pattern;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public revision: number;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public code: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public name: string;
}
