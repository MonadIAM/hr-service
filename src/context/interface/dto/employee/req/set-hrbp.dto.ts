import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "EmployeeSetHRBPBody" })
export class SetHrbpBodyDTO {
    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public employee?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public reason: string;
}

@ApiSchema({ name: "EmployeeSetHRBPQuery" })
export class SetHRBPQueryDTO {
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
