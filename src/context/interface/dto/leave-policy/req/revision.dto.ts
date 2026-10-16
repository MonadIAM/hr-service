import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "LeavePolicyCreateRevisionBody" })
export class RevisionBodyDTO {
    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false, type: String })
    declare public name?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false, type: String })
    declare public jurisdiction?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsArray()
    @ApiProperty({ required: false, type: Array })
    declare public rules?: Entities.LeavePolicy.Rule[];
}

@ApiSchema({ name: "LeavePolicyCreateRevisionQuery" })
export class CreateRevisionQueryDTO {
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
