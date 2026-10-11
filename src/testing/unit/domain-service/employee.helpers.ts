import { jest } from "@jest/globals";

import { EmployeeService } from "~context/domain/services/employee.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class EmployeeUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.Employee.Contract {
    public service(): Unit.Domain.Employee.Service.Result {
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
            organization: {
                findUniqueOrThrow: jest.fn<(props: unknown) => Promise<Entities.Organization>>(),
                findUnique: jest.fn<(props: unknown) => Promise<Optional<Entities.Organization>>>(),
                find: jest.fn<(props: unknown) => Promise<Entities.Organization[]>>().mockResolvedValue([]),
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
        };

        const services = {
            employment: { create: jest.fn<Services.Employment.Create.Signature>() },
        };

        return {
            service: new EmployeeService(
                this.contract<Services.Employment.ServiceContract>(services.employment),
                this.contract<Repositories.PositionAssignment.Contract>(repositories.positionAssignment),
                this.contract<Repositories.WorkCalendar.Contract>(repositories.workCalendar),
                this.contract<Repositories.WorkSchedule.Contract>(repositories.workSchedule),
                this.contract<Repositories.Organization.Contract>(repositories.organization),
                this.contract<Repositories.LeavePolicy.Contract>(repositories.leavePolicy),
                this.contract<Repositories.HRRequest.Contract>(repositories.hrRequest),
                this.contract<Repositories.Employee.Contract>(repositories.employee),
            ),
            repositories,
            transaction,
            services,
        };
    }
}
