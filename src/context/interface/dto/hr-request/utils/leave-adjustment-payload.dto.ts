import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { LeaveUnit } from "~context/enums";

@ApiSchema({ name: "HRRequestLeaveAdjustmentPayload" })
export class LeaveAdjustmentPayloadDTO implements Entities.HRRequest.Payload.LeaveAdjustment {
    @Expose()
    @Validator.IsDecimal()
    @Validator.IsMatches(/^-?(?!0+(?:\.0+)?$)\d{1,8}(?:\.\d{1,6})?$/)
    @ApiProperty({ required: true })
    declare public balanceDelta: string;

    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true })
    declare public leavePolicy: string;

    @Expose()
    @Validator.IsDateOnly()
    @ApiProperty({ required: true })
    declare public effectiveOn: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public poolCode: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public reason: string;

    @Expose()
    @Validator.IsEnum(LeaveUnit)
    @ApiProperty({ required: true })
    declare public unit: LeaveUnit;
}
