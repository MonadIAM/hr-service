import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { HRRequestType } from "~context/enums";
import { Validator } from "~common/validator";

import { LeaveAdjustmentPayloadDTO } from "../utils/leave-adjustment-payload.dto";
import { ChangeTermsPayloadDTO } from "../utils/change-terms-payload.dto";
import { TerminatePayloadDTO } from "../utils/terminate-payload.dto";
import { TransferPayloadDTO } from "../utils/transfer-payload.dto";
import { AbsencePayloadDTO } from "../utils/absence-payload.dto";
import { HirePayloadDTO } from "../utils/hire-payload.dto";

@ApiSchema({ name: "HRRequestCreateBody" })
export class CreateBodyDTO<T extends HRRequestType = HRRequestType> {
    @Expose()
    @Validator.IsIn([1])
    @ApiProperty({ required: true })
    declare public payloadSchemaVersion: number;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public initiatorEmployee?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public relatedRequest?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public targetPosition?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public idempotencyKey: string;

    @Expose()
    @Validator.IsObject()
    @Validator.ValidateByType("type", {
        [HRRequestType.LEAVE_ADJUSTMENT]: LeaveAdjustmentPayloadDTO,
        [HRRequestType.CHANGE_TERMS]: ChangeTermsPayloadDTO,
        [HRRequestType.TERMINATE]: TerminatePayloadDTO,
        [HRRequestType.TRANSFER]: TransferPayloadDTO,
        [HRRequestType.ABSENCE]: AbsencePayloadDTO,
        [HRRequestType.REHIRE]: HirePayloadDTO,
        [HRRequestType.HIRE]: HirePayloadDTO,
    })
    @ApiProperty({ required: true, type: Object })
    declare public payload: Entities.HRRequest.Payload.ByType[T];

    @Expose()
    @Validator.IsEnum(HRRequestType)
    @ApiProperty({ required: true })
    declare public type: T;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false })
    declare public effectiveAt?: Date;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public employee: string;
}

@ApiSchema({ name: "HRRequestCreateQuery" })
export class CreateQueryDTO {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public organization: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public realm: string;
}
