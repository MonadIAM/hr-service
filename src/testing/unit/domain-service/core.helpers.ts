import { randomUUID } from "node:crypto";

import {
    WorkCalendarException,
    PositionAssignment,
    HRApprovalDecision,
    LeaveLedgerEntry,
    HRApprovalStep,
    WorkCalendar,
    WorkSchedule,
    Organization,
    LeavePolicy,
    Employment,
    HRRequest,
    Employee,
    Position,
    Absence,
} from "~context/domain/entities";
import {
    PositionAssignmentStatus,
    CalendarApplication,
    HRExecutionStatus,
    HRApprovalStatus,
    SchedulePattern,
    LeaveLedgerKind,
    HRRequestStatus,
    EmployeeStatus,
    HRDecisionKind,
    AbsenceStatus,
    HRRequestType,
    RecordStatus,
    DayOverride,
    LeaveUnit,
    PayPeriod,
} from "~context/enums";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class HRDomainUnitHelpers extends DomainServiceCoreUnitHelpers {
    public createOrganization(props: Partial<Entities.Organization.ConstructorProps> = {}): Entities.Organization {
        const entity = new Organization({ id: randomUUID(), realm: randomUUID(), ...props });
        return entity;
    }

    public createEmployee(
        props: Partial<Entities.Employee.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.Employee {
        const organization = props.organization ?? this.createOrganization();
        const entity = new Employee({
            employeeNumber: randomUUID(),
            firstName: "Alice",
            lastName: "Morgan",
            status: EmployeeStatus.DRAFT,
            termsRevision: 1,
            ...props,
            organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createPosition(
        props: Partial<Entities.Position.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.Position {
        const organization = props.organization ?? this.createOrganization();
        const entity = new Position({
            code: randomUUID(),
            title: "Engineer",
            department: randomUUID(),
            team: randomUUID(),
            plannedFte: "1.0000",
            status: RecordStatus.ACTIVE,
            ...props,
            organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createWorkCalendar(
        props: Partial<Entities.WorkCalendar.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.WorkCalendar {
        const organization = props.organization ?? this.createOrganization();
        const entity = new WorkCalendar({
            code: randomUUID(),
            name: "Standard calendar",
            countryCode: "GB",
            status: RecordStatus.ACTIVE,
            holidays: [
                {
                    code: "NEW_YEAR",
                    name: "New Year",
                    isPublicHoliday: true,
                    effectiveFrom: "2026-01-01",
                    effectiveTo: null,
                    periods: [{ from: "01-01", through: "01-01" }],
                },
            ],
            ...props,
            organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createWorkSchedule(
        props: Partial<Entities.WorkSchedule.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.WorkSchedule {
        const organization = props.organization ?? this.createOrganization();
        const entity = new WorkSchedule({
            code: randomUUID(),
            name: "Standard schedule",
            patternType: SchedulePattern.CYCLIC,
            calendarApplication: CalendarApplication.KEEP_CYCLE,
            pattern: { schemaVersion: 1, cycle: [{ intervals: [{ start: "09:00", end: "17:00", endDayOffset: 0 }] }] },
            ...props,
            organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createLeavePolicy(
        props: Partial<Entities.LeavePolicy.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.LeavePolicy {
        const organization = props.organization ?? this.createOrganization();
        const entity = new LeavePolicy({
            code: randomUUID(),
            name: "Annual leave",
            jurisdiction: "GB",
            rules: [
                {
                    poolCode: "ANNUAL",
                    unit: "DAY",
                    annualEntitlement: "28",
                    accrualBasis: "SERVICE_MONTHS",
                    dayCounting: "CALENDAR_DAYS",
                    availability: "BALANCE",
                    expiration: null,
                },
            ],
            ...props,
            organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createWorkCalendarException(
        props: Partial<Entities.WorkCalendarException.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.WorkCalendarException {
        const calendar = props.calendar ?? this.createWorkCalendar({ organization: props.organization });
        const entity = new WorkCalendarException({
            date: "2026-12-25",
            name: "Christmas",
            holidayOverride: true,
            workdayOverride: DayOverride.DAY_OFF,
            source: "manual",
            ...props,
            calendar,
            organization: props.organization ?? calendar.organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createHRRequest(
        props: Partial<Entities.HRRequest.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.HRRequest {
        const employee = props.employee ?? this.createEmployee({ organization: props.organization });
        const entity = new HRRequest({
            type: HRRequestType.ABSENCE,
            status: HRRequestStatus.DRAFT,
            executionStatus: HRExecutionStatus.NOT_STARTED,
            payloadSchemaVersion: 1,
            payload: { poolCode: "ANNUAL", days: 5 },
            initiatorAccount: randomUUID(),
            idempotencyKey: randomUUID(),
            revision: 1,
            ...props,
            employee,
            organization: props.organization ?? employee.organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createEmployment(
        props: Partial<Entities.Employment.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.Employment {
        const employee = props.employee ?? this.createEmployee({ organization: props.organization });
        const entity = new Employment({
            termsRevision: 1,
            validFrom: "2026-01-01",
            validTo: "2026-07-01",
            termsSnapshot: { contractType: "permanent", salary: "5000.00" },
            ...props,
            employee,
            organization: props.organization ?? employee.organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createPositionAssignment(
        props: Partial<Entities.PositionAssignment.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.PositionAssignment {
        const employee = props.employee ?? this.createEmployee({ organization: props.organization });
        const position = props.position ?? this.createPosition({ organization: employee.organization });
        const entity = new PositionAssignment({
            status: PositionAssignmentStatus.ACTIVE,
            positionTitle: position.title,
            department: position.department,
            team: position.team,
            fte: "1.0000",
            validFrom: "2026-01-01",
            salaryAmount: "5000.00",
            salaryCurrency: "GBP",
            salaryPeriod: PayPeriod.MONTH,
            placementSnapshot: { title: position.title },
            ...props,
            employee,
            position,
            organization: props.organization ?? employee.organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createHRApprovalStep(
        props: Partial<Entities.HRApprovalStep.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.HRApprovalStep {
        const request = props.request ?? this.createHRRequest({ organization: props.organization });
        const assigneeEmployee = props.assigneeEmployee ?? this.createEmployee({ organization: request.organization });
        const entity = new HRApprovalStep({
            requestRevision: request.revision,
            ordinal: 1,
            name: "Manager approval",
            status: HRApprovalStatus.WAITING,
            ...props,
            request,
            assigneeEmployee,
            organization: props.organization ?? request.organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createHRApprovalDecision(
        props: Partial<Entities.HRApprovalDecision.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.HRApprovalDecision {
        const step = props.step ?? this.createHRApprovalStep({ organization: props.organization });
        const entity = new HRApprovalDecision({
            actorEmployee: step.assigneeEmployee,
            request: step.request.id,
            requestRevision: step.requestRevision,
            actorAccount: randomUUID(),
            decision: HRDecisionKind.APPROVE,
            decidedAt: new Date("2026-01-02T10:00:00Z"),
            comment: "Approved",
            ...props,
            step,
            organization: props.organization ?? step.organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createAbsence(props: Partial<Entities.Absence.ConstructorProps> & { createdAt?: Date } = {}): Entities.Absence {
        const sourceRequest =
            props.sourceRequest ?? this.createHRRequest({ organization: props.organization, employee: props.employee });
        const leavePolicy = props.leavePolicy ?? this.createLeavePolicy({ organization: sourceRequest.organization });
        const entity = new Absence({
            employee: sourceRequest.employee,
            status: AbsenceStatus.SCHEDULED,
            sourceItemKey: randomUUID(),
            startDate: "2026-07-01",
            endDate: "2026-07-06",
            poolCode: "ANNUAL",
            quantity: "5.000000",
            timezone: "Europe/London",
            unit: LeaveUnit.DAY,
            calculationSnapshot: { days: 5 },
            ...props,
            sourceRequest,
            leavePolicy,
            organization: props.organization ?? sourceRequest.organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }

    public createLeaveLedgerEntry(
        props: Partial<Entities.LeaveLedgerEntry.ConstructorProps> & { createdAt?: Date } = {},
    ): Entities.LeaveLedgerEntry {
        const employee = props.employee ?? this.createEmployee({ organization: props.organization });
        const leavePolicy = props.leavePolicy ?? this.createLeavePolicy({ organization: employee.organization });
        const entity = new LeaveLedgerEntry({
            kind: LeaveLedgerKind.ACCRUAL,
            poolCode: "ANNUAL",
            unit: LeaveUnit.DAY,
            balanceDelta: "2.500000",
            reservedDelta: "0.000000",
            effectiveOn: "2026-01-01",
            reason: "Monthly accrual",
            idempotencyKey: randomUUID(),
            calculationSnapshot: { months: 1 },
            ...props,
            employee,
            leavePolicy,
            organization: props.organization ?? employee.organization,
        });
        entity.createdAt = props.createdAt ?? entity.createdAt;
        return entity;
    }
}
