import { Controller, HttpStatus, HttpCode, Delete, Inject, Patch, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermission, FormatResponse, Swagger, Extract } from "~common/decorators";
import { WORK_CALENDAR_COMMANDS } from "~context/application/commands";
import { WORK_CALENDAR_QUERIES } from "~context/application/queries";
import { PermissionCode, QueryMode } from "~context/enums";
import { SuccessMessageDTO } from "~common/dto";

import {
    ArchiveQueryDTO,
    GetByIdQueryDTO,
    GetListQueryDTO,
    RestoreQueryDTO,
    WorkCalendarDTO,
    ArchiveBodyDTO,
    CreateQueryDTO,
    GetListBodyDTO,
    RestoreBodyDTO,
    UpdateQueryDTO,
    CreateBodyDTO,
    PurgeQueryDTO,
    UpdateBodyDTO,
    PurgeBodyDTO,
    ListDTO,
} from "../dto/work-calendar";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CREATED, OK } = HttpStatus;

@ApiTags("WorkCalendar")
@Controller("/work-calendar")
export class WorkCalendarController {
    public constructor(
        @Inject(WORK_CALENDAR_COMMANDS)
        private readonly workCalendarCommands: Commands.WorkCalendar.ControllerContract,
        @Inject(WORK_CALENDAR_QUERIES)
        private readonly workCalendarQueries: Queries.WorkCalendar.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(WorkCalendarDTO)
    @ApiResponse({ status: OK, type: WorkCalendarDTO })
    @RequirePermission(PermissionCode.WORK_CALENDAR_READ_ABSOLUTE, PermissionCode.WORK_CALENDAR_READ_COMMON)
    @ApiOperation({
        summary: "Returns a work calendar by identifier",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(@Query() { organization, realm, view, id }: GetByIdQueryDTO): Queries.WorkCalendar.FindUnique.Result {
        return this.workCalendarQueries.findUnique({ organization, realm, view, calendar: id });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequirePermission(PermissionCode.WORK_CALENDAR_READ_ABSOLUTE, PermissionCode.WORK_CALENDAR_READ_COMMON)
    @ApiOperation({
        summary: "Returns a paginated list of work calendars",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Query() { organization, realm, view }: GetListQueryDTO,
        @Body() { pagination, filters, sort }: GetListBodyDTO,
    ): Queries.WorkCalendar.FindMany.Result {
        return this.workCalendarQueries.findMany({
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
    @RequirePermission(PermissionCode.WORK_CALENDAR_CREATE)
    @ApiOperation({
        summary: "Creates a new work calendar",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public create(
        @Query() { organization, realm }: CreateQueryDTO,
        @Body() input: CreateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkCalendar.Create.Result {
        return this.workCalendarCommands.create({ organization, context, realm, actor, input });
    }

    @HttpCode(OK)
    @Patch("update")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_CALENDAR_UPDATE)
    @ApiOperation({
        summary: "Updates work calendar metadata",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public update(
        @Query() { id, organization, realm }: UpdateQueryDTO,
        @Body() input: UpdateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkCalendar.Update.Result {
        return this.workCalendarCommands.update({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("archive")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_CALENDAR_ARCHIVE)
    @ApiOperation({
        summary: "Archives a work calendar",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public archive(
        @Query() { id, organization, realm }: ArchiveQueryDTO,
        @Body() input: ArchiveBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkCalendar.Archive.Result {
        return this.workCalendarCommands.archive({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("restore")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_CALENDAR_RESTORE)
    @ApiOperation({
        summary: "Restores a work calendar",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public restore(
        @Query() { id, organization, realm }: RestoreQueryDTO,
        @Body() input: RestoreBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkCalendar.Restore.Result {
        return this.workCalendarCommands.restore({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Delete("purge")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_CALENDAR_PURGE)
    @ApiOperation({
        summary: "Permanently deletes a revoked work calendar",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public purge(
        @Query() { id, organization, realm }: PurgeQueryDTO,
        @Body() input: PurgeBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkCalendar.Purge.Result {
        return this.workCalendarCommands.purge({ organization, context, realm, actor, input, id });
    }
}
