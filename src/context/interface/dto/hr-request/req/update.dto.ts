import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { HRRequestType } from "~context/enums";
import { Validator } from "~common/validator";

import { LeaveAdjustmentPayloadDTO } from "../utils/leave-adjustment-payload.dto";
import { ChangeTermsPayloadDTO } from "../utils/change-terms-payload.dto";
import { TerminatePayloadDTO } from "../utils/terminate-payload.dto";
import { TransferPayloadDTO } from "../utils/transfer-payload.dto";
import { HirePayloadDTO } from "../utils/hire-payload.dto";

@ApiSchema({ name: "HRRequestUpdatePatch" })
export class UpdatePatchDTO {
    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsIn([1])
    @ApiProperty({ required: false })
    declare public payloadSchemaVersion?: number;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsUUID()
    @ApiProperty({ required: false })
    declare public relatedRequest?: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsUUID()
    @ApiProperty({ required: false })
    declare public targetPosition?: string;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsDate()
    @ApiProperty({ required: false })
    declare public effectiveAt?: Date;

    @Expose()
    @Validator.IsOptional({ nullable: false })
    @Validator.IsObject()
    @ApiProperty({ required: false })
    declare public payload?: UnknownObject;
}

@ApiSchema({ name: "HRRequestUpdateBody" })
export class UpdateBodyDTO {
    @Expose()
    @Validator.IsObject()
    @Validator.ValidateNested()
    @Validator.ValidateByType(
        "type",
        {
            [HRRequestType.LEAVE_ADJUSTMENT]: LeaveAdjustmentPayloadDTO,
            [HRRequestType.CHANGE_TERMS]: ChangeTermsPayloadDTO,
            [HRRequestType.TERMINATE]: TerminatePayloadDTO,
            [HRRequestType.TRANSFER]: TransferPayloadDTO,
            [HRRequestType.REHIRE]: HirePayloadDTO,
            [HRRequestType.HIRE]: HirePayloadDTO,
        },
        "payload",
    )
    @Type(() => UpdatePatchDTO)
    @ApiProperty({ required: true, type: UpdatePatchDTO })
    declare public patch: UpdatePatchDTO;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public reason: string;

    @Expose()
    @Validator.IsEnum(HRRequestType)
    @ApiProperty({ required: true, enum: HRRequestType })
    declare public type: HRRequestType;
}

@ApiSchema({ name: "HRRequestUpdateQuery" })
export class UpdateQueryDTO {
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
