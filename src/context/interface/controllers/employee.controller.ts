import { Controller, HttpStatus, HttpCode, Inject, Patch, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermission, FormatResponse, Swagger, Extract } from "~common/decorators";
import { EMPLOYEE_COMMANDS } from "~context/application/commands";
import { EMPLOYEE_QUERIES } from "~context/application/queries";
import { PermissionCode, QueryMode } from "~context/enums";
import { SuccessMessageDTO } from "~common/dto";

import {
    UnlinkAccountQueryDTO,
    UnlinkAccountBodyDTO,
    LinkAccountQueryDTO,
    LinkAccountBodyDTO,
    ArchiveQueryDTO,
    GetByIdQueryDTO,
    GetListQueryDTO,
    RestoreQueryDTO,
    SetHRBPQueryDTO,
    ArchiveBodyDTO,
    CreateQueryDTO,
    GetListBodyDTO,
    RestoreBodyDTO,
    SetHrbpBodyDTO,
    UpdateQueryDTO,
    CreateBodyDTO,
    UpdateBodyDTO,
    EmployeeDTO,
    ListDTO,
} from "../dto/employee";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CREATED, OK } = HttpStatus;

@ApiTags("Employee")
@Controller("/employee")
export class EmployeeController {
    public constructor(
        @Inject(EMPLOYEE_COMMANDS)
        private readonly employeeCommands: Commands.Employee.ControllerContract,
        @Inject(EMPLOYEE_QUERIES)
        private readonly employeeQueries: Queries.Employee.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(EmployeeDTO)
    @ApiResponse({ status: OK, type: EmployeeDTO })
    @RequirePermission(PermissionCode.EMPLOYEE_READ_ABSOLUTE, PermissionCode.EMPLOYEE_READ_COMMON)
    @ApiOperation({
        summary: "Returns an employee by identifier",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(@Query() { organization, realm, view, id }: GetByIdQueryDTO): Queries.Employee.FindUnique.Result {
        return this.employeeQueries.findUnique({ organization, realm, view, employee: id });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequirePermission(PermissionCode.EMPLOYEE_READ_ABSOLUTE, PermissionCode.EMPLOYEE_READ_COMMON)
    @ApiOperation({
        summary: "Returns a paginated list of employees",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Query() { organization, realm, view }: GetListQueryDTO,
        @Body() { pagination, filters, sort }: GetListBodyDTO,
    ): Queries.Employee.FindMany.Result {
        return this.employeeQueries.findMany({
            mode: QueryMode.DEFAULT,
            organization,
            pagination,
            filters,
            realm,
            view,
            sort,
        });
    }

    @Post("create")
    @HttpCode(CREATED)
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: CREATED, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.EMPLOYEE_CREATE)
    @ApiOperation({
        summary: "Creates a new employee",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public create(
        @Query() { organization, realm }: CreateQueryDTO,
        @Body() input: CreateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Employee.Create.Result {
        return this.employeeCommands.create({ organization, context, realm, actor, input });
    }

    @HttpCode(OK)
    @Patch("update")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.EMPLOYEE_UPDATE)
    @ApiOperation({
        summary: "Updates employee metadata",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public update(
        @Query() { id, organization, realm }: UpdateQueryDTO,
        @Body() input: UpdateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Employee.Update.Result {
        return this.employeeCommands.update({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("link-account")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.EMPLOYEE_LINK_ACCOUNT)
    @ApiOperation({
        summary: "Links an account to an employee",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public linkAccount(
        @Query() { id, organization, realm }: LinkAccountQueryDTO,
        @Body() input: LinkAccountBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Employee.LinkAccount.Result {
        return this.employeeCommands.linkAccount({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("unlink-account")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.EMPLOYEE_LINK_ACCOUNT)
    @ApiOperation({
        summary: "Unlinks an account from an employee",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public unlinkAccount(
        @Query() { id, organization, realm }: UnlinkAccountQueryDTO,
        @Body() input: UnlinkAccountBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Employee.UnlinkAccount.Result {
        return this.employeeCommands.unlinkAccount({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("archive")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.EMPLOYEE_ARCHIVE)
    @ApiOperation({
        summary: "Archives an employee",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public archive(
        @Query() { id, organization, realm }: ArchiveQueryDTO,
        @Body() input: ArchiveBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Employee.Archive.Result {
        return this.employeeCommands.archive({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("restore")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.EMPLOYEE_RESTORE)
    @ApiOperation({
        summary: "Restores an employee",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public restore(
        @Query() { id, organization, realm }: RestoreQueryDTO,
        @Body() input: RestoreBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Employee.Restore.Result {
        return this.employeeCommands.restore({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("set-hrbp")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.EMPLOYEE_SET_HRBP)
    @ApiOperation({
        summary: "Sets the HRBP for an employee",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public setHRBP(
        @Query() { id, organization, realm }: SetHRBPQueryDTO,
        @Body() input: SetHrbpBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Employee.SetHRBP.Result {
        return this.employeeCommands.setHRBP({ organization, context, realm, actor, input, id });
    }
}
