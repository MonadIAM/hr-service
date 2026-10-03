import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { HRApprovalStatus, HRDecisionKind } from "~context/enums";
import {
    HR_APPROVAL_STEP_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    EMPLOYEE_REPOSITORY,
} from "~context/infrastructure/repositories";

import { HR_APPROVAL_DECISION_SERVICE } from "./tokens";
import { HRApprovalStep } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class HRApprovalStepService implements Services.HRApprovalStep.Contract {
    public constructor(
        @Inject(HR_APPROVAL_DECISION_SERVICE)
        private readonly hrApprovalDecisionService: Services.HRApprovalDecision.ServiceContract,
        @Inject(HR_APPROVAL_STEP_REPOSITORY)
        private readonly hrApprovalStepRepository: Repositories.HRApprovalStep.Contract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: Repositories.Employee.Contract,
    ) {}

    public create(props: Services.HRApprovalStep.Create.Props): Services.HRApprovalStep.Create.Result {
        const { transaction, organization, input } = props;

        const entity = new HRApprovalStep({
            ...input,
            requestRevision: input.request.revision,
            status: HRApprovalStatus.WAITING,
            organization,
        });

        entity.canCreate();

        transaction.persist(entity);

        return entity;
    }

    public async reassign(props: Services.HRApprovalStep.Reassign.Props): Services.HRApprovalStep.Reassign.Result {
        const { transaction, organization, id } = props;
        const [_, employee] = await Promise.all([
            this.hrRequestRepository.findUniqueOrThrow({
                options: {
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    refresh: true,
                },
                where: {
                    approvalSteps: { $some: { organization, id } },
                    organization,
                },
                transaction,
            }),
            this.employeeRepository.findUniqueOrThrow({
                where: { id: props.employee, organization },
                transaction,
            }),
        ]);

        const entity = await this.hrApprovalStepRepository.findUniqueOrThrow({
            options: {
                populate: ["assigneeEmployee"],
                strategy: "select-in",
                refresh: true,
            },
            where: { organization, id },
            transaction,
        });

        entity.reassign({ employee });

        return entity;
    }

    public async activate(props: Services.HRApprovalStep.Activate.Props): Services.HRApprovalStep.Activate.Result {
        const { transaction, organization, id } = props;

        const [_, entity] = await Promise.all([
            this.hrRequestRepository.findUniqueOrThrow({
                options: {
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    refresh: true,
                },
                where: {
                    approvalSteps: { $some: { organization, id } },
                    organization,
                },
                transaction,
            }),
            this.hrApprovalStepRepository.findUniqueOrThrow({
                options: {
                    populate: ["assigneeEmployee"],
                    strategy: "select-in",
                    refresh: true,
                },
                where: { organization, id },
                transaction,
            }),
        ]);

        entity.activate();

        return entity;
    }

    public async skip(props: Services.HRApprovalStep.Skip.Props): Services.HRApprovalStep.Skip.Result {
        const { transaction, organization, id } = props;

        const [_, entity] = await Promise.all([
            this.hrRequestRepository.findUniqueOrThrow({
                options: {
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    refresh: true,
                },
                where: {
                    approvalSteps: { $some: { organization, id } },
                    organization,
                },
                transaction,
            }),
            this.hrApprovalStepRepository.findUniqueOrThrow({
                options: { refresh: true },
                where: { organization, id },
                transaction,
            }),
        ]);

        entity.skip();

        return entity;
    }

    public async decide(props: Services.HRApprovalStep.Decide.Props): Services.HRApprovalStep.Decide.Result {
        const { transaction, organization, decision, id } = props;
        const [request, actorEmployee] = await Promise.all([
            this.hrRequestRepository.findUniqueOrThrow({
                options: {
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    refresh: true,
                },
                where: {
                    approvalSteps: { $some: { organization, id } },
                    organization,
                },
                transaction,
            }),
            this.employeeRepository.findUniqueOrThrow({
                where: { id: props.actorEmployee, organization },
                transaction,
            }),
        ]);

        const [entity, pending] = await Promise.all([
            this.hrApprovalStepRepository.findUniqueOrThrow({
                options: {
                    populate: ["assigneeEmployee"],
                    strategy: "select-in",
                    refresh: true,
                },
                where: { organization, id },
                transaction,
            }),
            this.hrApprovalStepRepository.find({
                options: {
                    populate: decision === HRDecisionKind.APPROVE ? ["assigneeEmployee"] : [],
                    limit: decision === HRDecisionKind.APPROVE ? 1 : undefined,
                    orderBy: { ordinal: "ASC" },
                    strategy: "select-in",
                    refresh: true,
                },
                where: {
                    status: { $in: [HRApprovalStatus.WAITING, HRApprovalStatus.ACTIVE] },
                    requestRevision: request.revision,
                    request: { id: request.id },
                    id: { $ne: id },
                    organization,
                },
                transaction,
            }),
        ]);

        this.hrApprovalDecisionService.create({
            input: {
                actorAccount: props.actorAccount,
                comment: props.comment,
                actorEmployee,
                step: entity,
                decision,
            },
            organization,
            transaction,
        });

        switch (decision) {
            case HRDecisionKind.APPROVE:
                entity.approve();
                if (pending.length) {
                    pending[0].activate();
                } else {
                    request.approve();
                }
                break;
            case HRDecisionKind.REJECT:
                for (const step of pending) {
                    step.skip();
                }
                entity.reject();
                request.reject();
                break;
            case HRDecisionKind.RETURN:
                for (const step of pending) {
                    step.skip();
                }
                entity.returnForRevision();
                request.returnForRevision();
                break;
        }

        return entity;
    }
}
