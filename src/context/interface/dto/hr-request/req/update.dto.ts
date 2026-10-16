import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "HRRequestUpdateBody" })
export class UpdateBodyDTO {
    @Expose()
    @Validator.IsObject()
    @Type(() => Object)
    @ApiProperty({ required: true, type: Object })
    declare public patch: Partial<Omit<Entities.HRRequest.MutableFields, "targetPosition" | "relatedRequest">> & {
        targetPosition?: string;
        relatedRequest?: string;
    };

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public reason: string;
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
