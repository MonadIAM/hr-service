import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { HRApprovalStatus, HRExecutionStatus, HRRequestStatus, HRRequestType, PermissionCode } from "~context/enums";
import { Exception } from "~common/exceptions";
import {
    HR_APPROVAL_STEP_REPOSITORY,
    ORGANIZATION_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    EMPLOYEE_REPOSITORY,
    POSITION_REPOSITORY,
} from "~context/infrastructure/repositories";

import { HR_APPROVAL_STEP_SERVICE } from "./tokens";
import { HRRequest } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class HRRequestService implements Services.HRRequest.Contract {
    private readonly permissionDictionaryPath = "guard.permission";
    private readonly dictionaryPath = "services.hr-request";

    public constructor(
        @Inject(HR_APPROVAL_STEP_SERVICE)
        private readonly hrApprovalStepService: Services.HRApprovalStep.ServiceContract,
        @Inject(HR_APPROVAL_STEP_REPOSITORY)
        private readonly hrApprovalStepRepository: Repositories.HRApprovalStep.Contract,
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: Repositories.Employee.Contract,
        @Inject(POSITION_REPOSITORY)
        private readonly positionRepository: Repositories.Position.Contract,
    ) {}

    public async create(props: Services.HRRequest.Create.Props): Services.HRRequest.Create.Result {
        const { transaction, organization, realm, input } = props;
        const common = props.permissions.includes(PermissionCode.HR_REQUEST_CREATE);
        const types = [HRRequestType.CANCEL_REQUEST, HRRequestType.ABSENCE, HRRequestType.OVERTIME];

        if (!common && !props.permissions.includes(PermissionCode.HR_REQUEST_CREATE_PERSONAL)) {
            throw Exception.forbidden({ messageKey: `${this.permissionDictionaryPath}.INSUFFICIENT_PERMISSIONS` });
        }
        if (!common && !types.includes(input.type)) {
            throw Exception.forbidden({ messageKey: `${this.permissionDictionaryPath}.INSUFFICIENT_PERMISSIONS` });
        }

        const [organizationEntity, employeeEntity, initiatorEmployeeEntity, targetPositionEntity, relatedRequestEntity] =
            await Promise.all([
                this.organizationRepository.findUniqueOrThrow({
                    where: { id: organization, realm },
                    transaction,
                }),
                this.employeeRepository.findUniqueOrThrow({
                    where: {
                        ...(common ? {} : { account: props.actor }),
                        id: input.employee,
                        organization,
                    },
                    transaction,
                }),
                input.initiatorEmployee
                    ? this.employeeRepository.findUniqueOrThrow({
                          where: {
                              account: props.actor,
                              id: input.initiatorEmployee,
                              organization,
                          },
                          transaction,
                      })
                    : undefined,
                input.targetPosition
                    ? this.positionRepository.findUniqueOrThrow({
                          options: { lockMode: LockMode.PESSIMISTIC_READ, refresh: true },
                          where: { id: input.targetPosition, organization },
                          transaction,
                      })
                    : undefined,
                input.relatedRequest
                    ? this.hrRequestRepository.findUniqueOrThrow({
                          where: {
                              employee: { id: input.employee },
                              id: input.relatedRequest,
                              organization,
                          },
                          transaction,
                      })
                    : undefined,
            ]);

        targetPositionEntity?.assertReady();

        const requestEntity = new HRRequest({
            ...input,
            executionStatus: HRExecutionStatus.NOT_STARTED,
            status: HRRequestStatus.DRAFT,
            initiatorAccount: props.actor,
            initiatorEmployee: initiatorEmployeeEntity,
            targetPosition: targetPositionEntity,
            relatedRequest: relatedRequestEntity,
            organization: organizationEntity,
            employee: employeeEntity,
            revision: 1,
        });

        requestEntity.canCreate();

        transaction.persist(requestEntity);

        return requestEntity;
    }

    public async update(props: Services.HRRequest.Update.Props): Services.HRRequest.Update.Result {
        const { transaction, organization, realm, patch, id } = props;
        const common = props.permissions.includes(PermissionCode.HR_REQUEST_UPDATE);
        const types = [HRRequestType.CANCEL_REQUEST, HRRequestType.ABSENCE, HRRequestType.OVERTIME];

        if (!common && !props.permissions.includes(PermissionCode.HR_REQUEST_UPDATE_PERSONAL)) {
            throw Exception.forbidden({ messageKey: `${this.permissionDictionaryPath}.INSUFFICIENT_PERMISSIONS` });
        }

        const [requestEntity, targetPositionEntity, relatedRequestEntity] = await Promise.all([
            this.hrRequestRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                where: {
                    organization: { id: organization, realm },
                    ...(common
                        ? { type: props.type }
                        : {
                              initiatorAccount: props.actor,
                              employee: { account: props.actor },
                              type: { $eq: props.type, $in: types },
                          }),
                    id,
                },
                transaction,
            }),
            patch.targetPosition
                ? this.positionRepository.findUniqueOrThrow({
                      options: { lockMode: LockMode.PESSIMISTIC_READ, refresh: true },
                      where: { id: patch.targetPosition, organization },
                      transaction,
                  })
                : undefined,
            patch.relatedRequest
                ? this.hrRequestRepository.findUniqueOrThrow({
                      where: { id: patch.relatedRequest, organization },
                      transaction,
                  })
                : undefined,
        ]);

        targetPositionEntity?.assertReady();

        requestEntity.update({
            patch: {
                ...patch,
                targetPosition: targetPositionEntity,
                relatedRequest: relatedRequestEntity,
            },
        });

        return requestEntity;
    }

    public async submit(props: Services.HRRequest.Submit.Props): Services.HRRequest.Submit.Result {
        const { transaction, organization, realm, input, id } = props;
        const common = props.permissions.includes(PermissionCode.HR_REQUEST_SUBMIT);
        const types = [HRRequestType.CANCEL_REQUEST, HRRequestType.ABSENCE, HRRequestType.OVERTIME];

        if (!common && !props.permissions.includes(PermissionCode.HR_REQUEST_SUBMIT_PERSONAL)) {
            throw Exception.forbidden({ messageKey: `${this.permissionDictionaryPath}.INSUFFICIENT_PERMISSIONS` });
        }

        if (!input.steps.length) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.EMPTY_APPROVAL_ROUTE` });
        }

        const [organizationEntity, requestEntity, employeeEntities] = await Promise.all([
            this.organizationRepository.findUniqueOrThrow({
                where: { id: organization, realm },
                transaction,
            }),
            this.hrRequestRepository.findUniqueOrThrow({
                where: {
                    organization: { id: organization, realm },
                    ...(common
                        ? {}
                        : {
                              initiatorAccount: props.actor,
                              employee: { account: props.actor },
                              type: { $in: types },
                          }),
                    id,
                },
                transaction,
                options: {
                    populate: ["employee", "initiatorEmployee", "targetPosition", "relatedRequest"],
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    strategy: "select-in",
                },
            }),
            this.employeeRepository.find({
                where: {
                    id: { $in: input.steps.map((step) => step.assigneeEmployee) },
                    organization,
                },
                transaction,
            }),
        ]);

        const assignees = new Map(employeeEntities.map((employeeEntity) => [employeeEntity.id, employeeEntity]));

        requestEntity.submit(input);

        const steps: Entities.HRApprovalStep[] = [];
        for (const [index, step] of input.steps.entries()) {
            const assigneeEmployeeEntity = assignees.get(step.assigneeEmployee);

            if (!assigneeEmployeeEntity) {
                throw Exception.notFound({ messageKey: `${this.dictionaryPath}.ASSIGNEE_NOT_FOUND` });
            }

            const stepEntity = this.hrApprovalStepService.create({
                input: {
                    ...step,
                    assigneeEmployee: assigneeEmployeeEntity,
                    request: requestEntity,
                    ordinal: index + 1,
                },
                organization: organizationEntity,
                transaction,
            });

            steps.push(stepEntity);
            if (index === 0) {
                stepEntity.activate();
            }
        }

        return { request: requestEntity, steps };
    }

    public async withdraw(props: Services.HRRequest.Withdraw.Props): Services.HRRequest.Withdraw.Result {
        const { transaction, organization, realm, id } = props;
        const common = props.permissions.includes(PermissionCode.HR_REQUEST_WITHDRAW);
        const types = [HRRequestType.CANCEL_REQUEST, HRRequestType.ABSENCE, HRRequestType.OVERTIME];

        if (!common && !props.permissions.includes(PermissionCode.HR_REQUEST_WITHDRAW_PERSONAL)) {
            throw Exception.forbidden({ messageKey: `${this.permissionDictionaryPath}.INSUFFICIENT_PERMISSIONS` });
        }

        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: {
                organization: { id: organization, realm },
                ...(common
                    ? {}
                    : {
                          initiatorAccount: props.actor,
                          employee: { account: props.actor },
                          type: { $in: types },
                      }),
                id,
            },
            transaction,
        });

        const pendingStepEntities = await this.hrApprovalStepRepository.find({
            options: { populate: ["assigneeEmployee"], strategy: "select-in", refresh: true },
            transaction,
            where: {
                status: { $in: [HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE] },
                requestRevision: requestEntity.revision,
                request: { id },
                organization,
            },
        });

        const steps = pendingStepEntities
            .filter((step) => step.status === HRApprovalStatus.ACTIVE)
            .map((step) => ({ ...step }));
        requestEntity.withdraw();

        for (const stepEntity of pendingStepEntities) {
            stepEntity.skip();
        }

        return { request: requestEntity, steps };
    }

    public async approve(props: Services.HRRequest.Approve.Props): Services.HRRequest.Approve.Result {
        const { transaction, organization, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.approve();

        return requestEntity;
    }

    public async reject(props: Services.HRRequest.Reject.Props): Services.HRRequest.Reject.Result {
        const { transaction, organization, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.reject();

        return requestEntity;
    }

    public async returnForRevision(
        props: Services.HRRequest.ReturnForRevision.Props,
    ): Services.HRRequest.ReturnForRevision.Result {
        const { transaction, organization, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.returnForRevision();

        return requestEntity;
    }
}
