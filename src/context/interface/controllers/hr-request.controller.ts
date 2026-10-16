import { Controller, HttpStatus, HttpCode, Inject, Patch, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermission, FormatResponse, Swagger, Extract } from "~common/decorators";
import { HR_REQUEST_COMMANDS } from "~context/application/commands";
import { HR_REQUEST_QUERIES } from "~context/application/queries";
import { PermissionCode, QueryMode } from "~context/enums";
import { SuccessMessageDTO } from "~common/dto";

import {
    WithdrawQueryDTO,
    GetByIdQueryDTO,
    GetListQueryDTO,
    WithdrawBodyDTO,
    CreateQueryDTO,
    GetListBodyDTO,
    SubmitQueryDTO,
    UpdateQueryDTO,
    CreateBodyDTO,
    SubmitBodyDTO,
    UpdateBodyDTO,
    HRRequestDTO,
    ListDTO,
} from "../dto/hr-request";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CREATED, OK } = HttpStatus;

@ApiTags("HRRequest")
@Controller("/hr-request")
export class HRRequestController {
    public constructor(
        @Inject(HR_REQUEST_COMMANDS)
        private readonly hrRequestCommands: Commands.HRRequest.ControllerContract,
        @Inject(HR_REQUEST_QUERIES)
        private readonly hrRequestQueries: Queries.HRRequest.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(HRRequestDTO)
    @ApiResponse({ status: OK, type: HRRequestDTO })
    @RequirePermission(PermissionCode.HR_REQUEST_READ_ABSOLUTE, PermissionCode.HR_REQUEST_READ_COMMON)
    @ApiOperation({
        summary: "Returns a hrrequest by identifier",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(@Query() { organization, realm, view, id }: GetByIdQueryDTO): Queries.HRRequest.FindUnique.Result {
        return this.hrRequestQueries.findUnique({ organization, realm, view, request: id });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequirePermission(PermissionCode.HR_REQUEST_READ_ABSOLUTE, PermissionCode.HR_REQUEST_READ_COMMON)
    @ApiOperation({
        summary: "Returns a paginated list of hrrequests",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Query() { organization, realm, view }: GetListQueryDTO,
        @Body() { pagination, filters, sort }: GetListBodyDTO,
    ): Queries.HRRequest.FindMany.Result {
        return this.hrRequestQueries.findMany({
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
    @RequirePermission(PermissionCode.HR_REQUEST_CREATE)
    @ApiOperation({
        summary: "Creates a new hrrequest",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public create(
        @Query() { organization, realm }: CreateQueryDTO,
        @Body() input: CreateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.HRRequest.Create.Result {
        return this.hrRequestCommands.create({ organization, context, realm, actor, input });
    }

    @HttpCode(OK)
    @Patch("update")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.HR_REQUEST_UPDATE)
    @ApiOperation({
        summary: "Updates hrrequest metadata",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public update(
        @Query() { id, organization, realm }: UpdateQueryDTO,
        @Body() input: UpdateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.HRRequest.Update.Result {
        return this.hrRequestCommands.update({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("submit")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.HR_REQUEST_SUBMIT)
    @ApiOperation({
        summary: "Submits a hrrequest",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public submit(
        @Query() { id, organization, realm }: SubmitQueryDTO,
        @Body() input: SubmitBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.HRRequest.Submit.Result {
        return this.hrRequestCommands.submit({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("withdraw")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.HR_REQUEST_WITHDRAW)
    @ApiOperation({
        summary: "Withdraws a hrrequest",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public withdraw(
        @Query() { id, organization, realm }: WithdrawQueryDTO,
        @Body() input: WithdrawBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.HRRequest.Withdraw.Result {
        return this.hrRequestCommands.withdraw({ organization, context, realm, actor, input, id });
    }
}
