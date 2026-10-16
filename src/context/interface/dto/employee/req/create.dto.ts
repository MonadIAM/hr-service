import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "EmployeeCreateBody" })
export class CreateBodyDTO {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public employeeNumber: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public middleName?: string;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsString()
    @ApiProperty({ required: false })
    declare public workEmail?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public firstName: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true })
    declare public lastName: string;
}

@ApiSchema({ name: "EmployeeCreateQuery" })
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
