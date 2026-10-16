import { Controller, HttpStatus, HttpCode, Inject, Patch, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermission, FormatResponse, Swagger, Extract } from "~common/decorators";
import { HR_APPROVAL_STEP_COMMANDS } from "~context/application/commands";
import { HR_APPROVAL_STEP_QUERIES } from "~context/application/queries";
import { PermissionCode, QueryMode } from "~context/enums";
import { SuccessMessageDTO } from "~common/dto";

import {
    ReturnForRevisionQueryDTO,
    ReturnForRevisionBodyDTO,
    HRApprovalStepDTO,
    ReassignQueryDTO,
    ApproveQueryDTO,
    GetByIdQueryDTO,
    GetListQueryDTO,
    ReassignBodyDTO,
    ApproveBodyDTO,
    GetListBodyDTO,
    RejectQueryDTO,
    RejectBodyDTO,
    ListDTO,
} from "../dto/hr-approval-step";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, OK } = HttpStatus;

@ApiTags("HRApprovalStep")
@Controller("/hr-approval-step")
export class HRApprovalStepController {
    public constructor(
        @Inject(HR_APPROVAL_STEP_COMMANDS)
        private readonly hrApprovalStepCommands: Commands.HRApprovalStep.ControllerContract,
        @Inject(HR_APPROVAL_STEP_QUERIES)
        private readonly hrApprovalStepQueries: Queries.HRApprovalStep.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(HRApprovalStepDTO)
    @ApiResponse({ status: OK, type: HRApprovalStepDTO })
    @RequirePermission(PermissionCode.HR_APPROVAL_STEP_READ_ABSOLUTE, PermissionCode.HR_APPROVAL_STEP_READ_COMMON)
    @ApiOperation({
        summary: "Returns an HR approval step by identifier",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(
        @Query() { organization, realm, view, id }: GetByIdQueryDTO,
    ): Queries.HRApprovalStep.FindUnique.Result {
        return this.hrApprovalStepQueries.findUnique({ organization, realm, view, step: id });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequirePermission(PermissionCode.HR_APPROVAL_STEP_READ_ABSOLUTE, PermissionCode.HR_APPROVAL_STEP_READ_COMMON)
    @ApiOperation({
        summary: "Returns a paginated list of HR approval steps",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Query() { organization, realm, view }: GetListQueryDTO,
        @Body() { pagination, filters, sort }: GetListBodyDTO,
    ): Queries.HRApprovalStep.FindMany.Result {
        return this.hrApprovalStepQueries.findMany({
            mode: QueryMode.DEFAULT,
            organization,
            pagination,
            filters,
            realm,
            view,
            sort,
        });
    }

    @HttpCode(OK)
    @Patch("reassign")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.HR_APPROVAL_STEP_REASSIGN)
    @ApiOperation({
        summary: "Reassigns an HR approval step",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public reassign(
        @Query() { id, organization, realm }: ReassignQueryDTO,
        @Body() input: ReassignBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.HRApprovalStep.Reassign.Result {
        return this.hrApprovalStepCommands.reassign({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("approve")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.HR_APPROVAL_STEP_APPROVE)
    @ApiOperation({
        summary: "Approves an HR approval step",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public approve(
        @Query() { id, organization, realm }: ApproveQueryDTO,
        @Body() input: ApproveBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.HRApprovalStep.Approve.Result {
        return this.hrApprovalStepCommands.approve({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("reject")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.HR_APPROVAL_STEP_REJECT)
    @ApiOperation({
        summary: "Rejects an HR approval step",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public reject(
        @Query() { id, organization, realm }: RejectQueryDTO,
        @Body() input: RejectBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.HRApprovalStep.Reject.Result {
        return this.hrApprovalStepCommands.reject({ organization, context, realm, actor, input, id });
    }

    @HttpCode(OK)
    @Patch("return-for-revision")
    @FormatResponse(SuccessMessageDTO)
    @ApiResponse({ status: OK, type: SuccessMessageDTO })
    @RequirePermission(PermissionCode.HR_APPROVAL_STEP_RETURN_FOR_REVISION)
    @ApiOperation({
        summary: "Returns an HR approval step for revision",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public returnForRevision(
        @Query() { id, organization, realm }: ReturnForRevisionQueryDTO,
        @Body() input: ReturnForRevisionBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.HRApprovalStep.ReturnForRevision.Result {
        return this.hrApprovalStepCommands.returnForRevision({ organization, context, realm, actor, input, id });
    }
}
