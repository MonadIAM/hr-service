import { Controller, HttpStatus, HttpCode, Delete, Inject, Patch, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermission, FormatResponse, Swagger, Extract } from "~common/decorators";
import { WORK_SCHEDULE_COMMANDS } from "~context/application/commands";
import { WORK_SCHEDULE_QUERIES } from "~context/application/queries";
import { PermissionCode, QueryMode } from "~context/enums";
import { SuccessMessageDTO } from "~common/dto";

import {
    CreateRevisionQueryDTO,
    ArchiveQueryDTO,
    GetByIdQueryDTO,
    GetListQueryDTO,
    RestoreQueryDTO,
    RevisionBodyDTO,
    WorkScheduleDTO,
    ArchiveBodyDTO,
    CreateQueryDTO,
    GetListBodyDTO,
    RestoreBodyDTO,
    CreateBodyDTO,
    PurgeQueryDTO,
    PurgeBodyDTO,
    ListDTO,
} from "../dto/work-schedule";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CREATED, OK } = HttpStatus;

@ApiTags("WorkSchedule")
@Controller("/work-schedule")
export class WorkScheduleController {
    public constructor(
        @Inject(WORK_SCHEDULE_COMMANDS)
        private readonly workScheduleCommands: Commands.WorkSchedule.ControllerContract,
        @Inject(WORK_SCHEDULE_QUERIES)
        private readonly workScheduleQueries: Queries.WorkSchedule.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(WorkScheduleDTO)
    @ApiResponse({ status: OK, type: WorkScheduleDTO })
    @RequirePermission(PermissionCode.WORK_SCHEDULE_READ_ABSOLUTE, PermissionCode.WORK_SCHEDULE_READ_COMMON)
    @ApiOperation({
        summary: "Returns a work schedule by identifier",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(@Query() { organization, realm, view, id }: GetByIdQueryDTO): Queries.WorkSchedule.FindUnique.Result {
        return this.workScheduleQueries.findUnique({ organization, realm, view, schedule: id });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequirePermission(PermissionCode.WORK_SCHEDULE_READ_ABSOLUTE, PermissionCode.WORK_SCHEDULE_READ_COMMON)
    @ApiOperation({
        summary: "Returns a paginated list of work schedules",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Query() { organization, realm, view }: GetListQueryDTO,
        @Body() { pagination, filters, sort }: GetListBodyDTO,
    ): Queries.WorkSchedule.FindMany.Result {
        return this.workScheduleQueries.findMany({
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
    @RequirePermission(PermissionCode.WORK_SCHEDULE_CREATE)
    @ApiOperation({
        summary: "Creates a new work schedule",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public create(
        @Query() { organization, realm }: CreateQueryDTO,
        @Body() input: CreateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkSchedule.Create.Result {
        return this.workScheduleCommands.create({ organization, context, realm, actor, input });
    }

    @HttpCode(OK)
    @Post("create-revision")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_SCHEDULE_CREATE_REVISION)
    @ApiOperation({
        summary: "Creates a new revision of a work schedule",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public createRevision(
        @Query() { id, organization, realm }: CreateRevisionQueryDTO,
        @Body() input: RevisionBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkSchedule.CreateRevision.Result {
        return this.workScheduleCommands.createRevision({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("archive")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_SCHEDULE_ARCHIVE)
    @ApiOperation({
        summary: "Archives a work schedule",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public archive(
        @Query() { id, organization, realm }: ArchiveQueryDTO,
        @Body() input: ArchiveBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkSchedule.Archive.Result {
        return this.workScheduleCommands.archive({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("restore")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_SCHEDULE_RESTORE)
    @ApiOperation({
        summary: "Restores a work schedule",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public restore(
        @Query() { id, organization, realm }: RestoreQueryDTO,
        @Body() input: RestoreBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkSchedule.Restore.Result {
        return this.workScheduleCommands.restore({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Delete("purge")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.WORK_SCHEDULE_PURGE)
    @ApiOperation({
        summary: "Permanently deletes a revoked work schedule",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public purge(
        @Query() { id, organization, realm }: PurgeQueryDTO,
        @Body() input: PurgeBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.WorkSchedule.Purge.Result {
        return this.workScheduleCommands.purge({ organization, context, realm, actor, input, id });
    }
}
