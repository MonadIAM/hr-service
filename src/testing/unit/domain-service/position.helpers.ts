import { jest } from "@jest/globals";

import { PositionService } from "~context/domain/services/position.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class PositionUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.Position.Contract {
    public service(): Unit.Domain.Position.Service.Result {
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
            position: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Position>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Position>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Position[]>>().mockResolvedValue([]),
            },
        };
        const services = {};

        return {
            service: new PositionService(
                this.contract<Repositories.PositionAssignment.Contract>(repositories.positionAssignment),
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.Position.Contract>(repositories.position),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
