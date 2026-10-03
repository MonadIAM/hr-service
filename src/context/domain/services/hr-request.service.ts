import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import {
    HR_APPROVAL_STEP_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    EMPLOYEE_REPOSITORY,
    POSITION_REPOSITORY,
} from "~context/infrastructure/repositories";
import { HRExecutionStatus, HRApprovalStatus, HRRequestStatus } from "~context/enums";
import { Exception } from "~common/exceptions";

import { HR_APPROVAL_STEP_SERVICE } from "./tokens";
import { HRRequest } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class HRRequestService implements Services.HRRequest.Contract {
    private readonly dictionaryPath = "services.hr-request";

    public constructor(
        @Inject(HR_APPROVAL_STEP_SERVICE)
        private readonly hrApprovalStepService: Services.HRApprovalStep.ServiceContract,
        @Inject(HR_APPROVAL_STEP_REPOSITORY)
        private readonly hrApprovalStepRepository: Repositories.HRApprovalStep.Contract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: Repositories.Employee.Contract,
        @Inject(POSITION_REPOSITORY)
        private readonly positionRepository: Repositories.Position.Contract,
    ) {}

    public async create(props: Services.HRRequest.Create.Props): Services.HRRequest.Create.Result {
        const { transaction, organization, input } = props;
        const [employee, initiatorEmployee, targetPosition, relatedRequest] = await Promise.all([
            this.employeeRepository.findUniqueOrThrow({
                where: { id: input.employee, organization },
                transaction,
            }),
            input.initiatorEmployee
                ? this.employeeRepository.findUniqueOrThrow({
                      where: {
                          account: input.initiatorAccount,
                          id: input.initiatorEmployee,
                          organization,
                      },
                      transaction,
                  })
                : undefined,
            input.targetPosition
                ? this.positionRepository.findUniqueOrThrow({
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

        const entity = new HRRequest({
            ...input,
            executionStatus: HRExecutionStatus.NOT_STARTED,
            status: HRRequestStatus.DRAFT,
            initiatorEmployee,
            targetPosition,
            relatedRequest,
            organization,
            revision: 1,
            employee,
        });

        entity.canCreate();

        transaction.persist(entity);

        return entity;
    }

    public async update(props: Services.HRRequest.Update.Props): Services.HRRequest.Update.Result {
        const { transaction, organization, patch, id } = props;
        const [entity, targetPosition, relatedRequest] = await Promise.all([
            this.hrRequestRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                where: { organization, id },
                transaction,
            }),
            patch.targetPosition
                ? this.positionRepository.findUniqueOrThrow({
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

        entity.update({
            patch: {
                ...patch,
                targetPosition,
                relatedRequest,
            },
        });

        return entity;
    }

    public async submit(props: Services.HRRequest.Submit.Props): Services.HRRequest.Submit.Result {
        const { transaction, organization, input, id } = props;

        if (!input.steps.length) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.EMPTY_APPROVAL_ROUTE` });
        }

        const [entity, employees] = await Promise.all([
            this.hrRequestRepository.findUniqueOrThrow({
                where: { organization, id },
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

        const assignees = new Map(employees.map((employee) => [employee.id, employee]));

        entity.submit(input);

        for (const [index, step] of input.steps.entries()) {
            const assigneeEmployee = assignees.get(step.assigneeEmployee);

            if (!assigneeEmployee) {
                throw Exception.notFound({ messageKey: `${this.dictionaryPath}.ASSIGNEE_NOT_FOUND` });
            }

            const created = this.hrApprovalStepService.create({
                input: {
                    ...step,
                    ordinal: index + 1,
                    request: entity,
                    assigneeEmployee,
                },
                organization,
                transaction,
            });

            if (index === 0) {
                created.activate();
            }
        }

        return entity;
    }

    public async withdraw(props: Services.HRRequest.Withdraw.Props): Services.HRRequest.Withdraw.Result {
        const { transaction, organization, id } = props;
        const entity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        const pending = await this.hrApprovalStepRepository.find({
            options: { refresh: true },
            transaction,
            where: {
                status: { $in: [HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE] },
                requestRevision: entity.revision,
                request: { id },
                organization,
            },
        });

        entity.withdraw();

        for (const step of pending) {
            step.skip();
        }

        return entity;
    }

    public async approve(props: Services.HRRequest.Approve.Props): Services.HRRequest.Approve.Result {
        const { transaction, organization, id } = props;
        const entity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.approve();

        return entity;
    }

    public async reject(props: Services.HRRequest.Reject.Props): Services.HRRequest.Reject.Result {
        const { transaction, organization, id } = props;
        const entity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.reject();

        return entity;
    }

    public async returnForRevision(
        props: Services.HRRequest.ReturnForRevision.Props,
    ): Services.HRRequest.ReturnForRevision.Result {
        const { transaction, organization, id } = props;
        const entity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.returnForRevision();

        return entity;
    }

    public async cancel(props: Services.HRRequest.Cancel.Props): Services.HRRequest.Cancel.Result {
        const { transaction, organization, id } = props;
        const entity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.cancel();

        return entity;
    }

    public async scheduleApplication(
        props: Services.HRRequest.ScheduleApplication.Props,
    ): Services.HRRequest.ScheduleApplication.Result {
        const { transaction, organization, input, id } = props;
        const entity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.scheduleApplication(input);

        return entity;
    }

    public async beginApplication(
        props: Services.HRRequest.BeginApplication.Props,
    ): Services.HRRequest.BeginApplication.Result {
        const { transaction, organization, id } = props;
        const entity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.beginApplication();

        return entity;
    }

    public async markApplied(props: Services.HRRequest.MarkApplied.Props): Services.HRRequest.MarkApplied.Result {
        const { transaction, organization, input, id } = props;
        const entity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.markApplied(input);

        return entity;
    }

    public async markFailed(props: Services.HRRequest.MarkFailed.Props): Services.HRRequest.MarkFailed.Result {
        const { transaction, organization, input, id } = props;
        const entity = await this.hrRequestRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.markFailed(input);

        return entity;
    }
}
