import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequestTerminatePayload" })
export class TerminatePayloadDTO implements Entities.HRRequest.Payload.Terminate {
    @Expose()
    @Validator.IsDateOnly()
    @ApiProperty({ required: true })
    declare public employmentEndedOn: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public reason?: string;
}
