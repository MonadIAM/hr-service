import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequestOvertimePayload" })
export class OvertimePayloadDTO implements Entities.HRRequest.Payload.Overtime {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, example: "18:00" })
    declare public startTime: string;

    @Expose()
    @Validator.IsTimeRange("startTime")
    @ApiProperty({ required: true, example: "20:00" })
    declare public endTime: string;

    @Expose()
    @Validator.IsDateOnly()
    @ApiProperty({ required: true })
    declare public date: string;
}
