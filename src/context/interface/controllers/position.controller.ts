import { Controller, HttpStatus, HttpCode, Delete, Inject, Patch, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermission, FormatResponse, Swagger, Extract } from "~common/decorators";
import { POSITION_COMMANDS } from "~context/application/commands";
import { POSITION_QUERIES } from "~context/application/queries";
import { PermissionCode, QueryMode } from "~context/enums";
import { SuccessMessageDTO } from "~common/dto";

import {
    ArchiveQueryDTO,
    GetByIdQueryDTO,
    GetListQueryDTO,
    RestoreQueryDTO,
    ArchiveBodyDTO,
    CreateQueryDTO,
    GetListBodyDTO,
    RestoreBodyDTO,
    UpdateQueryDTO,
    CreateBodyDTO,
    PurgeQueryDTO,
    UpdateBodyDTO,
    PurgeBodyDTO,
    PositionDTO,
    ListDTO,
} from "../dto/position";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CREATED, OK } = HttpStatus;

@ApiTags("Position")
@Controller("/position")
export class PositionController {
    public constructor(
        @Inject(POSITION_COMMANDS)
        private readonly positionCommands: Commands.Position.ControllerContract,
        @Inject(POSITION_QUERIES)
        private readonly positionQueries: Queries.Position.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(PositionDTO)
    @RequirePermission(PermissionCode.POSITION_READ_ABSOLUTE, PermissionCode.POSITION_READ_COMMON)
    @ApiResponse({ status: OK, type: PositionDTO })
    @ApiOperation({
        summary: "Returns a position by identifier",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(@Query() { organization, realm, view, id }: GetByIdQueryDTO): Queries.Position.FindUnique.Result {
        return this.positionQueries.findUnique({ organization, realm, view, position: id });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequirePermission(PermissionCode.POSITION_READ_ABSOLUTE, PermissionCode.POSITION_READ_COMMON)
    @ApiOperation({
        summary: "Returns a paginated list of positions",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Query() { organization, realm, view }: GetListQueryDTO,
        @Body() { pagination, filters, sort }: GetListBodyDTO,
    ): Queries.Position.FindMany.Result {
        return this.positionQueries.findMany({
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
    @RequirePermission(PermissionCode.POSITION_CREATE)
    @ApiOperation({
        summary: "Creates a new position",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public create(
        @Query() { organization, realm }: CreateQueryDTO,
        @Body() input: CreateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Position.Create.Result {
        return this.positionCommands.create({ organization, context, realm, actor, input });
    }

    @HttpCode(OK)
    @Patch("update")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.POSITION_UPDATE)
    @ApiOperation({
        summary: "Updates position metadata",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public update(
        @Query() { id, organization, realm }: UpdateQueryDTO,
        @Body() input: UpdateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Position.Update.Result {
        return this.positionCommands.update({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("archive")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.POSITION_ARCHIVE)
    @ApiOperation({
        summary: "Archives a position",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public archive(
        @Query() { id, organization, realm }: ArchiveQueryDTO,
        @Body() input: ArchiveBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Position.Archive.Result {
        return this.positionCommands.archive({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("restore")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.POSITION_RESTORE)
    @ApiOperation({
        summary: "Restores a position",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public restore(
        @Query() { id, organization, realm }: RestoreQueryDTO,
        @Body() input: RestoreBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Position.Restore.Result {
        return this.positionCommands.restore({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Delete("purge")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.POSITION_PURGE)
    @ApiOperation({
        summary: "Permanently deletes a revoked position",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public purge(
        @Query() { id, organization, realm }: PurgeQueryDTO,
        @Body() input: PurgeBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Position.Purge.Result {
        return this.positionCommands.purge({ organization, context, realm, actor, input, id });
    }
}
