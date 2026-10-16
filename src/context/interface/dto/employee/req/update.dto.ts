import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "EmployeeUpdateBody" })
export class UpdateBodyDTO {
    @Expose()
    @Validator.IsObject()
    @ApiProperty({ required: true })
    declare public patch: Partial<Entities.Employee.MutableFields>;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public reason: string;
}

@ApiSchema({ name: "EmployeeUpdateQuery" })
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
