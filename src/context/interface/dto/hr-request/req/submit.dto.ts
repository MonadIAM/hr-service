import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequestWorkflowStep" })
export class HRRequestWorkflowStepDTO {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public assigneeEmployee: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public dueAt?: Date;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public name: string;
}

@ApiSchema({ name: "HRRequestSubmitBody" })
export class SubmitBodyDTO {
    @Expose()
    @Validator.IsNumber()
    @ApiProperty({ required: true, type: Number })
    declare public workflowVersion: number;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public workflowCode: string;

    @Expose()
    @Validator.IsArray()
    @Type(() => HRRequestWorkflowStepDTO)
    @ApiProperty({ required: true, type: () => [HRRequestWorkflowStepDTO] })
    declare public steps: HRRequestWorkflowStepDTO[];
}

@ApiSchema({ name: "HRRequestSubmitQuery" })
export class SubmitQueryDTO {
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
