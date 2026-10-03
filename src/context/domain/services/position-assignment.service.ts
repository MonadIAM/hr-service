import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { PositionAssignmentStatus } from "~context/enums";
import {
    POSITION_ASSIGNMENT_REPOSITORY,
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
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: Repositories.Employee.Contract,
        @Inject(POSITION_REPOSITORY)
        private readonly positionRepository: Repositories.Position.Contract,
    ) {}

    public async create(props: Services.PositionAssignment.Create.Props): Services.PositionAssignment.Create.Result {
        const { transaction, organization, input } = props;
        const [employee, position, sourceRequest] = await Promise.all([
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

        const entity = new PositionAssignment({
            ...input,
            placementSnapshot: {
                department: position.department,
                title: position.title,
                grade: position.grade,
                code: position.code,
                team: position.team,
            },
            status: PositionAssignmentStatus.ACTIVE,
            department: position.department,
            positionTitle: position.title,
            grade: position.grade,
            team: position.team,
            sourceRequest,
            organization,
            employee,
            position,
        });

        entity.canCreate();

        transaction.persist(entity);

        return entity;
    }

    public async close(props: Services.PositionAssignment.Close.Props): Services.PositionAssignment.Close.Result {
        const { transaction, organization, id } = props;
        const [entity, request] = await Promise.all([
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

        entity.close({
            validTo: props.validTo,
            request,
        });

        return entity;
    }

    public async void(props: Services.PositionAssignment.Void.Props): Services.PositionAssignment.Void.Result {
        const { transaction, organization, id } = props;
        const entity = await this.positionAssignmentRepository.findUniqueOrThrow({
            options: { lockMode: LockMode.PESSIMISTIC_WRITE },
            where: { organization, id },
            transaction,
        });

        entity.void();

        return entity;
    }

    public async transfer(props: Services.PositionAssignment.Transfer.Props): Services.PositionAssignment.Transfer.Result {
        const { transaction, organization, input, id } = props;
        const [employee, position, current, sourceRequest] = await Promise.all([
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

        current.close({
            validTo: input.validFrom,
            request: sourceRequest,
        });

        await transaction.flush();

        const entity = new PositionAssignment({
            ...input,
            placementSnapshot: {
                department: position.department,
                title: position.title,
                grade: position.grade,
                code: position.code,
                team: position.team,
            },
            status: PositionAssignmentStatus.ACTIVE,
            department: position.department,
            positionTitle: position.title,
            grade: position.grade,
            team: position.team,
            sourceRequest,
            organization,
            employee,
            position,
        });

        entity.canCreate();

        transaction.persist(entity);

        return entity;
    }
}
