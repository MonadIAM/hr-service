import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequestTransferPayload" })
export class TransferPayloadDTO implements Entities.HRRequest.Payload.Transfer {
    @Expose()
    @Validator.IsDateOnly()
    @ApiProperty({ required: true })
    declare public validFrom: string;

    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true })
    declare public position: string;
}
