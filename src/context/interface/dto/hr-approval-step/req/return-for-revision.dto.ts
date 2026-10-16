import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "HRApprovalStepReturnForRevisionBody" })
export class ReturnForRevisionBodyDTO {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public actorEmployee: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public comment?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public reason: string;
}

@ApiSchema({ name: "HRApprovalStepReturnForRevisionQuery" })
export class ReturnForRevisionQueryDTO {
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
