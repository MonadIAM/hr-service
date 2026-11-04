import { Body, Controller, HttpStatus, Post, HttpCode, Get, Query, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequireGlobalPermission, FormatResponse, Swagger } from "~common/decorators";
import { HR_REQUEST_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import { ManageGetByIdQueryDTO, ManageGetListQueryDTO, HRRequestDTO, GetListBodyDTO, ListDTO } from "../dto/hr-request";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, OK } = HttpStatus;

@ApiTags("HRRequest")
@Controller("/hr-request/manage")
export class HRRequestManageController {
    public constructor(
        @Inject(HR_REQUEST_QUERIES)
        private readonly hrRequestQueries: Queries.HRRequest.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(HRRequestDTO)
    @ApiResponse({ status: OK, type: HRRequestDTO })
    @RequireGlobalPermission(PermissionCode.HR_REQUEST_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a record by identifier across all realms",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(@Query() { view, mode, id }: ManageGetByIdQueryDTO): Queries.HRRequest.FindUnique.Result {
        return this.hrRequestQueries.findUnique({ request: id, mode, view });
    }

    @Post("list")
    @HttpCode(OK)
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequireGlobalPermission(PermissionCode.HR_REQUEST_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a paginated list across all realms",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Body() { pagination, filters, sort }: GetListBodyDTO,
        @Query() { view, mode }: ManageGetListQueryDTO,
    ): Queries.HRRequest.FindMany.Result {
        return this.hrRequestQueries.findMany({ pagination, filters, mode, view, sort });
    }
}
