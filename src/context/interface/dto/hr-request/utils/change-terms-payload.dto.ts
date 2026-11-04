import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequestChangeTermsPayload" })
export class ChangeTermsPayloadDTO implements Entities.HRRequest.Payload.ChangeTerms {
    @Expose()
    @Validator.IsOptional()
    @Validator.IsDateOnly()
    @ApiProperty({ required: false, nullable: true })
    declare public scheduleAnchorDate?: string | null;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsTimeZone()
    @ApiProperty({ required: false })
    declare public scheduleTimezone?: string;

    @Expose()
    @Validator.IsDateOnly()
    @ApiProperty({ required: true })
    declare public termsValidFrom: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDateOnly()
    @ApiProperty({ required: false, nullable: true })
    declare public contractEndsOn?: string | null;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false, nullable: true })
    declare public contractType?: string | null;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsUUID()
    @ApiProperty({ required: false })
    declare public workCalendar?: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsUUID()
    @ApiProperty({ required: false })
    declare public workSchedule?: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsUUID()
    @ApiProperty({ required: false })
    declare public leavePolicy?: string;
}
