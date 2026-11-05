import { jest } from "@jest/globals";

import { HRRequestExecutionService } from "~context/domain/services/hr-request-execution.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class HRRequestExecutionUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.HRRequestExecution.Contract {
    public service(): Unit.Domain.HRRequestExecution.Service.Result {
        const transaction = this.transaction();
        const repositories = {
            positionAssignment: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.PositionAssignment>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.PositionAssignment>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.PositionAssignment[]>>().mockResolvedValue([]),
            },
            workCalendar: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.WorkCalendar>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.WorkCalendar>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.WorkCalendar[]>>().mockResolvedValue([]),
            },
            workSchedule: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.WorkSchedule>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.WorkSchedule>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.WorkSchedule[]>>().mockResolvedValue([]),
            },
            leavePolicy: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.LeavePolicy>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.LeavePolicy>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.LeavePolicy[]>>().mockResolvedValue([]),
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
        const services = {
            employee: {
                changeTerms: jest.fn<Services.Employee.ChangeTerms.Signature>(),
                terminate: jest.fn<Services.Employee.Terminate.Signature>(),
            },
        };

        return {
            service: new HRRequestExecutionService(
                this.contract<Services.Employee.ProcessorContract>(services.employee),
                this.contract<Repositories.PositionAssignment.Contract>(repositories.positionAssignment),
                this.contract<Repositories.WorkCalendar.Contract>(repositories.workCalendar),
                this.contract<Repositories.WorkSchedule.Contract>(repositories.workSchedule),
                this.contract<Repositories.LeavePolicy.Contract>(repositories.leavePolicy),
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
