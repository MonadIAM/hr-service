import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { QueryOrder } from "@mikro-orm/postgresql";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";

@ApiSchema({ name: "HRApprovalStepSort" })
export class SortDTO implements Repositories.Mappers.HRApprovalStep.Sort {
    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(QueryOrder)
    @ApiProperty({ required: false, enum: QueryOrder, enumName: "QueryOrder" })
    public requestRevision?: QueryOrder;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(QueryOrder)
    @ApiProperty({ required: false, enum: QueryOrder, enumName: "QueryOrder" })
    public resolvedAt?: QueryOrder;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(QueryOrder)
    @ApiProperty({ required: false, enum: QueryOrder, enumName: "QueryOrder" })
    public createdAt?: QueryOrder;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(QueryOrder)
    @ApiProperty({ required: false, enum: QueryOrder, enumName: "QueryOrder" })
    public updatedAt?: QueryOrder;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(QueryOrder)
    @ApiProperty({ required: false, enum: QueryOrder, enumName: "QueryOrder" })
    public version?: QueryOrder;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(QueryOrder)
    @ApiProperty({ required: false, enum: QueryOrder, enumName: "QueryOrder" })
    public ordinal?: QueryOrder;

    @Expose()
    @Validator.IsOptional()
    @Validator.IsEnum(QueryOrder)
    @ApiProperty({ required: false, enum: QueryOrder, enumName: "QueryOrder" })
    public dueAt?: QueryOrder;
}
