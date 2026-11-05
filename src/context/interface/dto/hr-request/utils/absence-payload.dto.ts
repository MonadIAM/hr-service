import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { LeaveUnit } from "~context/enums";

@ApiSchema({ name: "HRRequestAbsencePayload" })
export class AbsencePayloadDTO {
    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsDateOnly()
    @ApiProperty({ required: false })
    declare public startDate?: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public startsAt?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public poolCode: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsDateOnly()
    @ApiProperty({ required: false })
    declare public endDate?: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public endsAt?: string;

    @Expose()
    @Validator.IsEnum(LeaveUnit)
    @Validator.IsPeriod({
        [LeaveUnit.MINUTE]: { dateOnly: false, from: "startsAt", to: "endsAt" },
        [LeaveUnit.DAY]: { dateOnly: true, from: "startDate", to: "endDate" },
    })
    @ApiProperty({ required: true })
    declare public unit: LeaveUnit;
}
