import { WorkCalendarExceptionRepository } from "~context/infrastructure/repositories/work-calendar-exception.repository";
import { PositionAssignmentRepository } from "~context/infrastructure/repositories/position-assignment.repository";
import { LeaveLedgerEntryRepository } from "~context/infrastructure/repositories/leave-ledger-entry.repository";
import { WorkCalendarRepository } from "~context/infrastructure/repositories/work-calendar.repository";
import { WorkScheduleRepository } from "~context/infrastructure/repositories/work-schedule.repository";
import { LeavePolicyRepository } from "~context/infrastructure/repositories/leave-policy.repository";
import { HRRequestExecutionService } from "~context/domain/services/hr-request-execution.service";
import { HRRequestRepository } from "~context/infrastructure/repositories/hr-request.repository";
import { PositionRepository } from "~context/infrastructure/repositories/position.repository";
import { EmployeeRepository } from "~context/infrastructure/repositories/employee.repository";
import { AbsenceRepository } from "~context/infrastructure/repositories/absence.repository";

import { EmployeeIntegrationHelpers } from "./employee.helpers";

export class HRRequestExecutionIntegrationHelpers implements Integration.Domain.HRRequestExecution.Contract {
    public service(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.HRRequestExecution.Service.Context {
        const repositories = {
            workCalendarException: new WorkCalendarExceptionRepository(context.readManager),
            positionAssignment: new PositionAssignmentRepository(context.readManager),
            leaveLedgerEntry: new LeaveLedgerEntryRepository(context.readManager),
            workCalendar: new WorkCalendarRepository(context.readManager),
            workSchedule: new WorkScheduleRepository(context.readManager),
            leavePolicy: new LeavePolicyRepository(context.readManager),
            hrRequest: new HRRequestRepository(context.readManager),
            employee: new EmployeeRepository(context.readManager),
            position: new PositionRepository(context.readManager),
            absence: new AbsenceRepository(context.readManager),
        };

        return {
            service: new HRRequestExecutionService(
                new EmployeeIntegrationHelpers().service(context).service,
                repositories.workCalendarException,
                repositories.positionAssignment,
                repositories.leaveLedgerEntry,
                repositories.workCalendar,
                repositories.workSchedule,
                repositories.leavePolicy,
                repositories.hrRequest,
                repositories.employee,
                repositories.position,
                repositories.absence,
            ),
            repositories,
        };
    }
}
