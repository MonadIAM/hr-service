import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { PayPeriod } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequestHirePayload" })
export class HirePayloadDTO implements Entities.HRRequest.Payload.Hire {
    @Expose()
    @Validator.IsDateOnly()
    @ApiProperty({ required: true })
    declare public employmentStartedOn: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsDateOnly()
    @ApiProperty({ required: false })
    declare public scheduleAnchorDate?: string;

    @Expose()
    @Validator.IsTimeZone()
    @ApiProperty({ required: true })
    declare public scheduleTimezone: string;

    @Expose()
    @Validator.IsDateOnly()
    @ApiProperty({ required: true })
    declare public termsValidFrom: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsDateOnly()
    @ApiProperty({ required: false })
    declare public contractEndsOn?: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public contractType?: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsString()
    @Validator.IsMatches(/^[A-Z]{3}$/)
    @ApiProperty({ required: false })
    declare public salaryCurrency?: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsEnum(PayPeriod)
    @ApiProperty({ required: false })
    declare public salaryPeriod?: PayPeriod;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsDecimal()
    @Validator.IsMatches(/^\d{1,16}(?:\.\d{1,2})?$/)
    @ApiProperty({ required: false })
    declare public salaryAmount?: string;

    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true })
    declare public workCalendar: string;

    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true })
    declare public workSchedule: string;

    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true })
    declare public leavePolicy: string;

    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true })
    declare public position: string;

    @Expose()
    @Validator.IsDecimal()
    @Validator.IsMatches(/^(?:0\.(?!0{1,4}$)\d{1,4}|1(?:\.0{1,4})?)$/)
    @ApiProperty({ required: true })
    declare public fte: string;
}
