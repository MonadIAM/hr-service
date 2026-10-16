import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { HRExecutionStatus, HRRequestStatus, HRRequestType } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequest" })
export class HRRequestDTO {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public id: string;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public version: number;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: true, type: Date })
    declare public createdAt: Date;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public updatedAt?: Date;

    @Expose()
    @Validator.IsEnum(HRExecutionStatus)
    @ApiProperty({ required: true, type: Object })
    declare public executionStatus: HRExecutionStatus;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public payloadSchemaVersion: number;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsInt()
    @ApiProperty({ required: false, type: Number })
    declare public approvedRevision?: number;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsInt()
    @ApiProperty({ required: false, type: Number })
    declare public workflowVersion?: number;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsInt()
    @ApiProperty({ required: false, type: Number })
    declare public appliedRevision?: number;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public initiatorAccount: string;

    @Expose()
    @Validator.IsEnum(HRRequestStatus)
    @ApiProperty({ required: true, type: Object })
    declare public status: HRRequestStatus;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public idempotencyKey: string;

    @Expose()
    @Validator.IsObject()
    @ApiProperty({ required: true, type: Object })
    declare public payload: UnknownObject;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsObject()
    @ApiProperty({ required: false, type: Object })
    declare public result?: UnknownObject;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false, type: String })
    declare public workflowCode?: string;

    @Expose()
    @Validator.IsEnum(HRRequestType)
    @ApiProperty({ required: true, type: Object })
    declare public type: HRRequestType;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public effectiveAt?: Date;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public submittedAt?: Date;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public approvedAt?: Date;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public appliedAt?: Date;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public revision: number;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false, type: String })
    declare public failure?: string;
}
