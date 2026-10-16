import { Controller, HttpStatus, HttpCode, Delete, Inject, Patch, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermission, FormatResponse, Swagger, Extract } from "~common/decorators";
import { LEAVE_POLICY_COMMANDS } from "~context/application/commands";
import { LEAVE_POLICY_QUERIES } from "~context/application/queries";
import { PermissionCode, QueryMode } from "~context/enums";
import { SuccessMessageDTO } from "~common/dto";

import {
    CreateRevisionQueryDTO,
    ArchiveQueryDTO,
    GetByIdQueryDTO,
    GetListQueryDTO,
    RestoreQueryDTO,
    RevisionBodyDTO,
    ArchiveBodyDTO,
    CreateQueryDTO,
    GetListBodyDTO,
    LeavePolicyDTO,
    RestoreBodyDTO,
    CreateBodyDTO,
    PurgeQueryDTO,
    PurgeBodyDTO,
    ListDTO,
} from "../dto/leave-policy";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CREATED, OK } = HttpStatus;

@ApiTags("LeavePolicy")
@Controller("/leave-policy")
export class LeavePolicyController {
    public constructor(
        @Inject(LEAVE_POLICY_COMMANDS)
        private readonly leavePolicyCommands: Commands.LeavePolicy.ControllerContract,
        @Inject(LEAVE_POLICY_QUERIES)
        private readonly leavePolicyQueries: Queries.LeavePolicy.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(LeavePolicyDTO)
    @ApiResponse({ status: OK, type: LeavePolicyDTO })
    @RequirePermission(PermissionCode.LEAVE_POLICY_READ_ABSOLUTE, PermissionCode.LEAVE_POLICY_READ_COMMON)
    @ApiOperation({
        summary: "Returns a leave policy by identifier",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(@Query() { organization, realm, view, id }: GetByIdQueryDTO): Queries.LeavePolicy.FindUnique.Result {
        return this.leavePolicyQueries.findUnique({ organization, realm, view, policy: id });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequirePermission(PermissionCode.LEAVE_POLICY_READ_ABSOLUTE, PermissionCode.LEAVE_POLICY_READ_COMMON)
    @ApiOperation({
        summary: "Returns a paginated list of leave policys",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Query() { organization, realm, view }: GetListQueryDTO,
        @Body() { pagination, filters, sort }: GetListBodyDTO,
    ): Queries.LeavePolicy.FindMany.Result {
        return this.leavePolicyQueries.findMany({
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
    @RequirePermission(PermissionCode.LEAVE_POLICY_CREATE)
    @ApiOperation({
        summary: "Creates a new leave policy",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public create(
        @Query() { organization, realm }: CreateQueryDTO,
        @Body() input: CreateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.LeavePolicy.Create.Result {
        return this.leavePolicyCommands.create({ organization, context, realm, actor, input });
    }

    @HttpCode(OK)
    @Post("create-revision")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.LEAVE_POLICY_CREATE_REVISION)
    @ApiOperation({
        summary: "Creates a new revision of a leave policy",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public createRevision(
        @Query() { id, organization, realm }: CreateRevisionQueryDTO,
        @Body() input: RevisionBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.LeavePolicy.CreateRevision.Result {
        return this.leavePolicyCommands.createRevision({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("archive")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.LEAVE_POLICY_ARCHIVE)
    @ApiOperation({
        summary: "Archives a leave policy",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public archive(
        @Query() { id, organization, realm }: ArchiveQueryDTO,
        @Body() input: ArchiveBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.LeavePolicy.Archive.Result {
        return this.leavePolicyCommands.archive({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("restore")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.LEAVE_POLICY_RESTORE)
    @ApiOperation({
        summary: "Restores a leave policy",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public restore(
        @Query() { id, organization, realm }: RestoreQueryDTO,
        @Body() input: RestoreBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.LeavePolicy.Restore.Result {
        return this.leavePolicyCommands.restore({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Delete("purge")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.LEAVE_POLICY_PURGE)
    @ApiOperation({
        summary: "Permanently deletes a revoked leave policy",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public purge(
        @Query() { id, organization, realm }: PurgeQueryDTO,
        @Body() input: PurgeBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.LeavePolicy.Purge.Result {
        return this.leavePolicyCommands.purge({ organization, context, realm, actor, input, id });
    }
}
