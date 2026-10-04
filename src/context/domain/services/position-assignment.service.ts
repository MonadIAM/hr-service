import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { PositionAssignmentStatus } from "~context/enums";
import {
    POSITION_ASSIGNMENT_REPOSITORY,
    ORGANIZATION_REPOSITORY,
    HR_REQUEST_REPOSITORY,
    EMPLOYEE_REPOSITORY,
    POSITION_REPOSITORY,
} from "~context/infrastructure/repositories";

import { PositionAssignment } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class PositionAssignmentService implements Services.PositionAssignment.Contract {
    public constructor(
        @Inject(POSITION_ASSIGNMENT_REPOSITORY)
        private readonly positionAssignmentRepository: Repositories.PositionAssignment.Contract,
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: Repositories.Employee.Contract,
        @Inject(POSITION_REPOSITORY)
        private readonly positionRepository: Repositories.Position.Contract,
    ) {}

    public async create(props: Services.PositionAssignment.Create.Props): Services.PositionAssignment.Create.Result {
        const { transaction, organization, input } = props;
        const [organizationEntity, employeeEntity, positionEntity, sourceRequestEntity] = await Promise.all([
            this.organizationRepository.findUniqueOrThrow({
                where: { id: organization },
                transaction,
            }),
            this.employeeRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                where: { id: input.employee, organization },
                transaction,
            }),
            this.positionRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                where: { id: input.position, organization },
                transaction,
            }),
            input.sourceRequest
                ? this.hrRequestRepository.findUniqueOrThrow({
                      where: {
                          employee: { id: input.employee },
                          id: input.sourceRequest,
                          organization,
                      },
                      transaction,
                  })
                : undefined,
        ]);

        const assignmentEntity = new PositionAssignment({
            ...input,
            organization: organizationEntity,
            placementSnapshot: {
                department: positionEntity.department,
                title: positionEntity.title,
                grade: positionEntity.grade,
                code: positionEntity.code,
                team: positionEntity.team,
            },
            status: PositionAssignmentStatus.ACTIVE,
            department: positionEntity.department,
            positionTitle: positionEntity.title,
            grade: positionEntity.grade,
            team: positionEntity.team,
            sourceRequest: sourceRequestEntity,
            employee: employeeEntity,
            position: positionEntity,
        });

        assignmentEntity.canCreate();

        transaction.persist(assignmentEntity);

        return assignmentEntity;
    }

    public async close(props: Services.PositionAssignment.Close.Props): Services.PositionAssignment.Close.Result {
        const { transaction, organization, id } = props;
        const [assignmentEntity, requestEntity] = await Promise.all([
            this.positionAssignmentRepository.findUniqueOrThrow({
                options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                where: { organization, id },
                transaction,
            }),
            props.request
                ? this.hrRequestRepository.findUniqueOrThrow({
                      where: { id: props.request, organization },
                      transaction,
                  })
                : undefined,
        ]);

        assignmentEntity.close({
            validTo: props.validTo,
            request: requestEntity,
        });

        return assignmentEntity;
    }

    public async void(props: Services.PositionAssignment.Void.Props): Services.PositionAssignment.Void.Result {
        const { transaction, organization, id } = props;
        const assignmentEntity = await this.positionAssignmentRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        assignmentEntity.void();

        return assignmentEntity;
    }

    public async transfer(props: Services.PositionAssignment.Transfer.Props): Services.PositionAssignment.Transfer.Result {
        const { transaction, organization, input, id } = props;
        const [organizationEntity, employeeEntity, positionEntity, currentAssignmentEntity, sourceRequestEntity] =
            await Promise.all([
                this.organizationRepository.findUniqueOrThrow({
                    where: { id: organization },
                    transaction,
                }),
                this.employeeRepository.findUniqueOrThrow({
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                    where: { id: input.employee, organization },
                    transaction,
                }),
                this.positionRepository.findUniqueOrThrow({
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                    where: { id: input.position, organization },
                    transaction,
                }),
                this.positionAssignmentRepository.findUniqueOrThrow({
                    options: { lockMode: LockMode.PESSIMISTIC_WRITE },
                    where: {
                        employee: { id: input.employee },
                        organization,
                        id,
                    },
                    transaction,
                }),
                input.sourceRequest
                    ? this.hrRequestRepository.findUniqueOrThrow({
                          where: {
                              employee: { id: input.employee },
                              id: input.sourceRequest,
                              organization,
                          },
                          transaction,
                      })
                    : undefined,
            ]);

        currentAssignmentEntity.close({
            validTo: input.validFrom,
            request: sourceRequestEntity,
        });

        await transaction.flush();

        const assignmentEntity = new PositionAssignment({
            ...input,
            organization: organizationEntity,
            placementSnapshot: {
                department: positionEntity.department,
                title: positionEntity.title,
                grade: positionEntity.grade,
                code: positionEntity.code,
                team: positionEntity.team,
            },
            status: PositionAssignmentStatus.ACTIVE,
            department: positionEntity.department,
            positionTitle: positionEntity.title,
            sourceRequest: sourceRequestEntity,
            grade: positionEntity.grade,
            team: positionEntity.team,
            employee: employeeEntity,
            position: positionEntity,
        });

        assignmentEntity.canCreate();

        transaction.persist(assignmentEntity);

        return assignmentEntity;
    }
}
