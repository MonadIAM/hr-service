import { Controller, HttpStatus, HttpCode, Delete, Inject, Patch, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermission, FormatResponse, Swagger, Extract } from "~common/decorators";
import { WORK_CALENDAR_EXCEPTION_COMMANDS } from "~context/application/commands";
import { WORK_CALENDAR_EXCEPTION_QUERIES } from "~context/application/queries";
import { PermissionCode, QueryMode } from "~context/enums";
import { SuccessMessageDTO } from "~common/dto";

import {
    WorkCalendarExceptionDTO,
    GetByIdQueryDTO,
    GetListQueryDTO,
    CreateQueryDTO,
    GetListBodyDTO,
    UpdateQueryDTO,
    CreateBodyDTO,
    PurgeQueryDTO,
    UpdateBodyDTO,
    PurgeBodyDTO,
    ListDTO,
} from "../dto/work-calendar-exception";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CREATED, OK } = HttpStatus;

@ApiTags("WorkCalendarException")
@Controller("/work-calendar-exception")
export class WorkCalendarExceptionController {
    public constructor(
        @Inject(WORK_CALENDAR_EXCEPTION_COMMANDS)
        private readonly workCalendarExceptionCommands: Commands.WorkCalendarException.ControllerContract,
        @Inject(WORK_CALENDAR_EXCEPTION_QUERIES)
        private readonly workCalendarExceptionQueries: Queries.WorkCalendarException.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(WorkCalendarExceptionDTO)
    @ApiResponse({ status: OK, type: WorkCalendarExceptionDTO })
    @RequirePermission(
        PermissionCode.WORK_CALENDAR_EXCEPTION_READ_ABSOLUTE,
        PermissionCode.WORK_CALENDAR_EXCEPTION_READ_COMMON,
    )
    @ApiOperation({
        summary: "Returns a work calendar exception by identifier",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(
        @Query() { organization, realm, view, id }: GetByIdQueryDTO,
    ): Queries.WorkCalendarException.FindUnique.Result {
        return this.workCalendarExceptionQueries.findUnique({ organization, realm, view, exception: id });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequirePermission(
        PermissionCode.WORK_CALENDAR_EXCEPTION_READ_ABSOLUTE,
        PermissionCode.WORK_CALENDAR_EXCEPTION_READ_COMMON,
    )
    @ApiOperation({
        summary: "Returns a paginated list of work calendar exceptions",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Query() { organization, realm, view }: GetListQueryDTO,
        @Body() { pagination, filters, sort }: GetListBodyDTO,
    ): Queries.WorkCalendarException.FindMany.Result {
        return this.workCalendarExceptionQueries.findMany({
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
    @RequirePermission(PermissionCode.WORK_CALENDAR_EXCEPTION_CREATE)
    @ApiOperation({
        summary: "Creates a new work calendar exception",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public create(
        @Query() { organization, realm }: CreateQueryDTO,
        @Body() input: CreateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkCalendarException.Create.Result {
        return this.workCalendarExceptionCommands.create({ organization, context, realm, actor, input });
    }

    @HttpCode(OK)
    @Patch("update")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_CALENDAR_EXCEPTION_UPDATE)
    @ApiOperation({
        summary: "Updates work calendar exception metadata",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public update(
        @Query() { id, organization, realm }: UpdateQueryDTO,
        @Body() input: UpdateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkCalendarException.Update.Result {
        return this.workCalendarExceptionCommands.update({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Delete("purge")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_CALENDAR_EXCEPTION_PURGE)
    @ApiOperation({
        summary: "Permanently deletes a revoked work calendar exception",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public purge(
        @Query() { id, organization, realm }: PurgeQueryDTO,
        @Body() input: PurgeBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkCalendarException.Purge.Result {
        return this.workCalendarExceptionCommands.purge({ organization, context, realm, actor, input, id });
    }
}
