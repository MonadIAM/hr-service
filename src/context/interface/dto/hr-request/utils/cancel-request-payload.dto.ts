import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequestCancelRequestPayload" })
export class CancelRequestPayloadDTO implements Entities.HRRequest.Payload.CancelRequest {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public reason: string;
}
