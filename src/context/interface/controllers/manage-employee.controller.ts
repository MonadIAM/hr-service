import { Body, Controller, HttpStatus, Post, HttpCode, Get, Query, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequireGlobalPermission, FormatResponse, Swagger } from "~common/decorators";
import { EMPLOYEE_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import { ManageGetByIdQueryDTO, ManageGetListQueryDTO, EmployeeDTO, GetListBodyDTO, ListDTO } from "../dto/employee";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, OK } = HttpStatus;

@ApiTags("Employee")
@Controller("/employee/manage")
export class EmployeeManageController {
    public constructor(
        @Inject(EMPLOYEE_QUERIES)
        private readonly employeeQueries: Queries.Employee.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(EmployeeDTO)
    @ApiResponse({ status: OK, type: EmployeeDTO })
    @RequireGlobalPermission(PermissionCode.EMPLOYEE_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a record by identifier across all realms",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(@Query() { view, mode, id }: ManageGetByIdQueryDTO): Queries.Employee.FindUnique.Result {
        return this.employeeQueries.findUnique({ employee: id, mode, view });
    }

    @Post("list")
    @HttpCode(OK)
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequireGlobalPermission(PermissionCode.EMPLOYEE_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a paginated list across all realms",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Body() { pagination, filters, sort }: GetListBodyDTO,
        @Query() { view, mode }: ManageGetListQueryDTO,
    ): Queries.Employee.FindMany.Result {
        return this.employeeQueries.findMany({ pagination, filters, mode, view, sort });
    }
}
