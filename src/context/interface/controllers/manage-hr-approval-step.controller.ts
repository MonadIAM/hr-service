import { Body, Controller, HttpStatus, Post, HttpCode, Get, Query, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequireGlobalPermission, FormatResponse, Swagger } from "~common/decorators";
import { HR_APPROVAL_STEP_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import {
    ManageGetByIdQueryDTO,
    ManageGetListQueryDTO,
    HRApprovalStepDTO,
    GetListBodyDTO,
    ListDTO,
} from "../dto/hr-approval-step";

const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, OK } = HttpStatus;

@ApiTags("HRApprovalStep")
@Controller("/hr-approval-step/manage")
export class HRApprovalStepManageController {
    public constructor(
        @Inject(HR_APPROVAL_STEP_QUERIES)
        private readonly hrApprovalStepQueries: Queries.HRApprovalStep.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(HRApprovalStepDTO)
    @ApiResponse({ status: OK, type: HRApprovalStepDTO })
    @RequireGlobalPermission(PermissionCode.HR_APPROVAL_STEP_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a record by identifier across all realms",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    public findUnique(@Query() { view, mode, id }: ManageGetByIdQueryDTO): Queries.HRApprovalStep.FindUnique.Result {
        return this.hrApprovalStepQueries.findUnique({ step: id, mode, view });
    }

    @Post("list")
    @HttpCode(OK)
    @FormatResponse(ListDTO)
    @ApiResponse({ status: OK, type: ListDTO })
    @RequireGlobalPermission(PermissionCode.HR_APPROVAL_STEP_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a paginated list across all realms",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, UNAUTHORIZED, FORBIDDEN)
    public findMany(
        @Body() { pagination, filters, sort }: GetListBodyDTO,
        @Query() { view, mode }: ManageGetListQueryDTO,
    ): Queries.HRApprovalStep.FindMany.Result {
        return this.hrApprovalStepQueries.findMany({ pagination, filters, mode, view, sort });
    }
}
