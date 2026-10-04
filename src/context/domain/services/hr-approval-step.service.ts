import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { HRApprovalStatus, HRDecisionKind } from "~context/enums";
import {
    HR_APPROVAL_STEP_REPOSITORY,
    ORGANIZATION_REPOSITORY,
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
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: Repositories.Employee.Contract,
    ) {}

    public create(props: Services.HRApprovalStep.Create.Props): Services.HRApprovalStep.Create.Result {
        const { transaction, organization: organizationEntity, input } = props;

        const stepEntity = new HRApprovalStep({
            requestRevision: input.request.revision,
            status: HRApprovalStatus.WAITING,
            organization: organizationEntity,
            ...input,
        });

        stepEntity.canCreate();

        transaction.persist(stepEntity);

        return stepEntity;
    }

    public async reassign(props: Services.HRApprovalStep.Reassign.Props): Services.HRApprovalStep.Reassign.Result {
        const { transaction, organization, id } = props;
        const [_, employeeEntity] = await Promise.all([
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

        const stepEntity = await this.hrApprovalStepRepository.findUniqueOrThrow({
            options: {
                populate: ["assigneeEmployee"],
                strategy: "select-in",
                refresh: true,
            },
            where: { organization, id },
            transaction,
        });

        stepEntity.reassign({ employee: employeeEntity });

        return stepEntity;
    }

    public async activate(props: Services.HRApprovalStep.Activate.Props): Services.HRApprovalStep.Activate.Result {
        const { transaction, organization, id } = props;

        const [_, stepEntity] = await Promise.all([
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

        stepEntity.activate();

        return stepEntity;
    }

    public async skip(props: Services.HRApprovalStep.Skip.Props): Services.HRApprovalStep.Skip.Result {
        const { transaction, organization, id } = props;

        const [_, stepEntity] = await Promise.all([
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

        stepEntity.skip();

        return stepEntity;
    }

    public async decide(props: Services.HRApprovalStep.Decide.Props): Services.HRApprovalStep.Decide.Result {
        const { transaction, organization, decision, id } = props;
        const [organizationEntity, requestEntity, actorEmployeeEntity] = await Promise.all([
            this.organizationRepository.findUniqueOrThrow({
                where: { id: organization },
                transaction,
            }),
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

        const [stepEntity, pendingStepEntities] = await Promise.all([
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
                    requestRevision: requestEntity.revision,
                    request: { id: requestEntity.id },
                    id: { $ne: id },
                    organization,
                },
                transaction,
            }),
        ]);

        this.hrApprovalDecisionService.create({
            input: {
                actorEmployee: actorEmployeeEntity,
                actorAccount: props.actorAccount,
                comment: props.comment,
                step: stepEntity,
                decision,
            },
            organization: organizationEntity,
            transaction,
        });

        switch (decision) {
            case HRDecisionKind.APPROVE:
                stepEntity.approve();
                if (pendingStepEntities.length) {
                    pendingStepEntities[0].activate();
                } else {
                    requestEntity.approve();
                }
                break;
            case HRDecisionKind.REJECT:
                for (const pendingStepEntity of pendingStepEntities) {
                    pendingStepEntity.skip();
                }
                stepEntity.reject();
                requestEntity.reject();
                break;
            case HRDecisionKind.RETURN:
                for (const pendingStepEntity of pendingStepEntities) {
                    pendingStepEntity.skip();
                }
                stepEntity.returnForRevision();
                requestEntity.returnForRevision();
                break;
        }

        return stepEntity;
    }
}
