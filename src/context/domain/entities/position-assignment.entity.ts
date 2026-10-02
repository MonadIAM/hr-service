import { randomUUID } from "node:crypto";

import { PositionAssignmentStatus, PayPeriod, EmployeeStatus, RecordStatus } from "~context/enums";
import { Exception } from "~common/exceptions";

export class PositionAssignment implements Entities.PositionAssignment.Contract {
    private static readonly dictionaryPath = "entities.position-assignment";

    public id: string;
    public version: number = 1;
    public createdAt: Date;
    public updatedAt?: Date;

    public status: PositionAssignmentStatus;
    public placementSnapshot: UnknownObject;
    public salaryPeriod?: PayPeriod;
    public salaryCurrency?: string;
    public positionTitle: string;
    public salaryAmount?: string;
    public organization: string;
    public department: string;
    public validFrom: string;
    public validTo?: string;
    public grade?: string;
    public team?: string;
    public fte: string;

    public closedByRequest?: Entities.HRRequest;
    public sourceRequest?: Entities.HRRequest;
    public employee: Entities.Employee;
    public position: Entities.Position;

    public constructor(props: Entities.PositionAssignment.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.status = props.status ?? PositionAssignmentStatus.ACTIVE;
        this.placementSnapshot = props.placementSnapshot ?? {};
        this.fte = props.fte ?? "1";

        this.salaryCurrency = props.salaryCurrency;
        this.positionTitle = props.positionTitle;
        this.organization = props.organization;
        this.salaryAmount = props.salaryAmount;
        this.salaryPeriod = props.salaryPeriod;
        this.department = props.department;
        this.validFrom = props.validFrom;
        this.validTo = props.validTo;
        this.grade = props.grade;
        this.team = props.team;

        this.closedByRequest = props.closedByRequest;
        this.sourceRequest = props.sourceRequest;
        this.employee = props.employee;
        this.position = props.position;
    }

    public close({ validTo, request }: Entities.PositionAssignment.Close.Props): void {
        if (this.status !== PositionAssignmentStatus.ACTIVE) {
            throw Exception.invariantViolation({ messageKey: `${PositionAssignment.dictionaryPath}.INVALID_STATUS` });
        } else if (validTo < this.validFrom) {
            throw Exception.invariantViolation({ messageKey: `${PositionAssignment.dictionaryPath}.INVALID_PERIOD` });
        } else if (request && (request.organization !== this.organization || request.employee.id !== this.employee.id)) {
            throw Exception.invariantViolation({ messageKey: `${PositionAssignment.dictionaryPath}.REQUEST_MISMATCH` });
        } else {
            this.validTo = validTo;
            this.closedByRequest = request;
            this.status = PositionAssignmentStatus.CLOSED;
            this.updatedAt = new Date();
        }
    }

    public void(): void {
        if (this.status === PositionAssignmentStatus.VOIDED) {
            throw Exception.invariantViolation({ messageKey: `${PositionAssignment.dictionaryPath}.INVALID_STATUS` });
        } else {
            this.status = PositionAssignmentStatus.VOIDED;
            this.updatedAt = new Date();
        }
    }

    public canCreate(): void {
        if (this.employee.organization !== this.organization || this.position.organization !== this.organization) {
            throw Exception.invariantViolation({
                messageKey: `${PositionAssignment.dictionaryPath}.ORGANIZATION_MISMATCH`,
            });
        } else if (this.hasRequestMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${PositionAssignment.dictionaryPath}.REQUEST_MISMATCH` });
        } else if (this.status === PositionAssignmentStatus.ACTIVE) {
            if (this.employee.status !== EmployeeStatus.ACTIVE || this.position.status !== RecordStatus.ACTIVE) {
                throw Exception.invariantViolation({
                    messageKey: `${PositionAssignment.dictionaryPath}.INACTIVE_REFERENCE`,
                });
            } else if (this.department !== this.position.department || this.team !== this.position.team) {
                throw Exception.invariantViolation({
                    messageKey: `${PositionAssignment.dictionaryPath}.PLACEMENT_MISMATCH`,
                });
            }
        }
    }

    private hasRequestMismatch(): boolean {
        return [this.sourceRequest, this.closedByRequest].some(
            (req) => req && (req.organization !== this.organization || req.employee.id !== this.employee.id),
        );
    }
}
