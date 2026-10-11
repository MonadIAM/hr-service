import { jest } from "@jest/globals";

import { PositionAssignmentService } from "~context/domain/services/position-assignment.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class PositionAssignmentUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.PositionAssignment.Contract {
    public service(): Unit.Domain.PositionAssignment.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            positionAssignment: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.PositionAssignment>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.PositionAssignment>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.PositionAssignment[]>>().mockResolvedValue([]),
            },
            organization: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Organization>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Organization>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Organization[]>>().mockResolvedValue([]),
            },
            hrRequest: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.HRRequest>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.HRRequest>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.HRRequest[]>>().mockResolvedValue([]),
            },
            employee: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Employee>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Employee>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Employee[]>>().mockResolvedValue([]),
            },
            position: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Position>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Position>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Position[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new PositionAssignmentService(
                this.contract<Repositories.PositionAssignment.Contract>(repositories.positionAssignment),
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.HRRequest.Contract>(repositories.hrRequest),
                this.contract<Repositories.Employee.Contract>(repositories.employee),
                this.contract<Repositories.Position.Contract>(repositories.position),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
