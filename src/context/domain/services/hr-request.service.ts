import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { Exception } from "~common/exceptions";
import {
    POSITION_ASSIGNMENT_REPOSITORY,
    HR_APPROVAL_STEP_REPOSITORY,
    ORGANIZATION_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    EMPLOYEE_REPOSITORY,
    POSITION_REPOSITORY,
} from "~context/infrastructure/repositories";
import {
    PositionAssignmentStatus,
    HRExecutionStatus,
    HRApprovalStatus,
    HRRequestStatus,
    HRRequestType,
    PermissionCode,
} from "~context/enums";

import { HR_APPROVAL_STEP_SERVICE, EMPLOYEE_SERVICE } from "./tokens";
import { HRRequest } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class HRRequestService implements Services.HRRequest.Contract {
    private readonly permissionDictionaryPath = "guard.permission";
    private readonly dictionaryPath = "services.hr-request";

    public constructor(
        @Inject(HR_APPROVAL_STEP_SERVICE)
        private readonly hrApprovalStepService: Services.HRApprovalStep.ServiceContract,
        @Inject(EMPLOYEE_SERVICE)
        private readonly employeeService: Services.Employee.ProcessorContract,
        @Inject(POSITION_ASSIGNMENT_REPOSITORY)
        private readonly positionAssignmentRepository: Repositories.PositionAssignment.Contract,
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

    public async beginLeave(props: Services.HRRequest.BeginLeave.Props): Services.HRRequest.BeginLeave.Result {
        const { transaction, identifiers } = props;
        const requests = await this.hrRequestRepository.find({
            options: {
                populate: ["organization", "employee"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                orderBy: { id: "ASC" },
                strategy: "select-in",
                refresh: true,
            },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: new Date() } }, { effectiveAt: null }],
                status: HRRequestStatus.APPROVED,
                type: HRRequestType.TERMINATE,
                id: { $in: identifiers },
            },
            transaction,
        });

        for (const request of requests) {
            request.beginApplication();
            const employmentEndedOn = request.payload.employmentEndedOn;

            try {
                if (
                    typeof employmentEndedOn !== "string" ||
                    !/^\d{4}-\d{2}-\d{2}$/.test(employmentEndedOn) ||
                    !Number.isFinite(Date.parse(employmentEndedOn)) ||
                    new Date(employmentEndedOn).toISOString().slice(0, 10) !== employmentEndedOn
                ) {
                    throw Exception.invariantViolation({
                        messageKey: `${this.dictionaryPath}.INVALID_TERMINATION_PAYLOAD`,
                    });
                } else {
                    request.employee.canTerminate({ employmentEndedOn });
                }
            } catch (error) {
                if (!(error instanceof Exception) || Boolean(Exception.isRetryable(error))) {
                    throw error;
                } else {
                    request.markFailed({ reason: error.message });
                }
            }
        }

        const unlinked = requests.filter(
            (request) => request.executionStatus === HRExecutionStatus.RUNNING && !request.employee.account,
        );

        if (unlinked.length) {
            const identifiers = [...new Set(unlinked.map(({ employee }) => employee.id))];
            const [employees, assignments] = await Promise.all([
                this.employeeRepository.find({
                    options: {
                        populate: ["workCalendar", "workSchedule", "leavePolicy"],
                        lockMode: LockMode.PESSIMISTIC_WRITE,
                        orderBy: { id: "ASC" },
                        strategy: "select-in",
                        refresh: true,
                    },
                    where: { id: { $in: identifiers } },
                    transaction,
                }),
                this.positionAssignmentRepository.find({
                    options: {
                        lockMode: LockMode.PESSIMISTIC_WRITE,
                        orderBy: { id: "ASC" },
                        refresh: true,
                    },
                    where: {
                        status: PositionAssignmentStatus.ACTIVE,
                        employee: { id: { $in: identifiers } },
                    },
                    transaction,
                }),
            ]);

            const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
            const assignmentsByEmployee = new Map<string, Entities.PositionAssignment[]>();

            for (const assignment of assignments) {
                const group = assignmentsByEmployee.get(assignment.employee.id) ?? [];
                group.push(assignment);
                assignmentsByEmployee.set(assignment.employee.id, group);
            }

            for (const request of unlinked) {
                this.employeeService.terminate({
                    assignments: assignmentsByEmployee.get(request.employee.id) ?? [],
                    input: { employmentEndedOn: request.payload.employmentEndedOn as string },
                    entity: employeesById.get(request.employee.id)!,
                    transaction,
                    request,
                });
                request.markApplied({ result: { employee: request.employee.id } });
            }
        }

        return requests;
    }

    public async confirmLeave(props: Services.HRRequest.ConfirmLeave.Props): Services.HRRequest.ConfirmLeave.Result {
        const { transaction, input, realm } = props;
        const request = await this.hrRequestRepository.findUnique({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            where: {
                organization: { id: input.organization, realm },
                employee: { account: input.account },
                type: HRRequestType.TERMINATE,
                id: input.process,
            },
            transaction,
        });

        if (request?.executionStatus === HRExecutionStatus.RUNNING) {
            const [employee, assignments] = await Promise.all([
                this.employeeRepository.findUniqueOrThrow({
                    options: {
                        populate: ["workCalendar", "workSchedule", "leavePolicy"],
                        lockMode: LockMode.PESSIMISTIC_WRITE,
                        strategy: "select-in",
                        refresh: true,
                    },
                    where: { organization: input.organization, id: request.employee.id },
                    transaction,
                }),
                this.positionAssignmentRepository.find({
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: "ASC" }, refresh: true },
                    where: {
                        status: PositionAssignmentStatus.ACTIVE,
                        employee: { id: request.employee.id },
                        organization: input.organization,
                    },
                    transaction,
                }),
            ]);

            this.employeeService.terminate({
                input: { employmentEndedOn: request.payload.employmentEndedOn as string },
                entity: employee,
                assignments,
                transaction,
                request,
            });
            request.markApplied({
                result: {
                    employee: request.employee.id,
                    account: input.account,
                },
            });
        }
    }

    public async rejectLeave(props: Services.HRRequest.RejectLeave.Props): Services.HRRequest.RejectLeave.Result {
        const { transaction, input, realm } = props;
        const request = await this.hrRequestRepository.findUnique({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
            where: {
                organization: { id: input.organization, realm },
                employee: { account: input.account },
                type: HRRequestType.TERMINATE,
                id: input.process,
            },
            transaction,
        });

        if (request?.executionStatus === HRExecutionStatus.RUNNING) {
            request.markFailed({ reason: input.reason });
        }
    }

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
                        ? {}
                        : {
                              initiatorAccount: props.actor,
                              employee: { account: props.actor },
                              type: { $in: types },
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

            if (index === 0) {
                stepEntity.activate();
            }
        }

        return requestEntity;
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
            options: { refresh: true },
            transaction,
            where: {
                status: { $in: [HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE] },
                requestRevision: requestEntity.revision,
                request: { id },
                organization,
            },
        });

        requestEntity.withdraw();

        for (const stepEntity of pendingStepEntities) {
            stepEntity.skip();
        }

        return requestEntity;
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

    public async cancel(props: Services.HRRequest.Cancel.Props): Services.HRRequest.Cancel.Result {
        const { transaction, organization, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.cancel();

        return requestEntity;
    }

    public async scheduleApplication(
        props: Services.HRRequest.ScheduleApplication.Props,
    ): Services.HRRequest.ScheduleApplication.Result {
        const { transaction, organization, input, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.scheduleApplication(input);

        return requestEntity;
    }

    public async beginApplication(
        props: Services.HRRequest.BeginApplication.Props,
    ): Services.HRRequest.BeginApplication.Result {
        const { transaction, organization, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.beginApplication();

        return requestEntity;
    }

    public async markApplied(props: Services.HRRequest.MarkApplied.Props): Services.HRRequest.MarkApplied.Result {
        const { transaction, organization, input, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.markApplied(input);

        return requestEntity;
    }

    public async markFailed(props: Services.HRRequest.MarkFailed.Props): Services.HRRequest.MarkFailed.Result {
        const { transaction, organization, input, id } = props;
        const requestEntity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        requestEntity.markFailed(input);

        return requestEntity;
    }
}
