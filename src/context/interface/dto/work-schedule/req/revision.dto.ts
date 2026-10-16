import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { CalendarApplication, SchedulePattern } from "~context/enums";

@ApiSchema({ name: "WorkScheduleCreateRevisionBody" })
export class RevisionBodyDTO {
    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false, type: String })
    declare public name?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(SchedulePattern)
    @ApiProperty({ required: false, enum: SchedulePattern })
    declare public patternType?: SchedulePattern;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsObject()
    @ApiProperty({ required: false, type: Object })
    declare public pattern?: Entities.WorkSchedule.Pattern;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(CalendarApplication)
    @ApiProperty({ required: false, enum: CalendarApplication })
    declare public calendarApplication?: CalendarApplication;
}

@ApiSchema({ name: "WorkScheduleCreateRevisionQuery" })
export class CreateRevisionQueryDTO {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public id: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public organization: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public realm: string;
}
