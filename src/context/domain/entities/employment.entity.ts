import { randomUUID } from "node:crypto";

import { Exception } from "~common/exceptions";

export class Employment implements Entities.Employment.Contract {
    private static readonly dictionaryPath = "entities.employment";

    public id: string;
    public createdAt: Date;

    public termsSnapshot: UnknownObject;
    public termsRevision: number;
    public organization: string;
    public validFrom: string;
    public validTo: string;

    public replacedByRequest?: Entities.HRRequest;
    public workCalendar?: Entities.WorkCalendar;
    public workSchedule?: Entities.WorkSchedule;
    public leavePolicy?: Entities.LeavePolicy;
    public employee: Entities.Employee;

    public constructor(props: Entities.Employment.ConstructorProps) {
        this.id = randomUUID();
        this.createdAt = new Date();

        this.termsRevision = props.termsRevision;
        this.termsSnapshot = props.termsSnapshot;
        this.organization = props.organization;
        this.validFrom = props.validFrom;
        this.validTo = props.validTo;

        this.replacedByRequest = props.replacedByRequest;
        this.workCalendar = props.workCalendar;
        this.workSchedule = props.workSchedule;
        this.leavePolicy = props.leavePolicy;
        this.employee = props.employee;
    }

    public canCreate(): void {
        if (this.hasOrganizationMismatch()) {
            throw Exception.invariantViolation({ messageKey: `${Employment.dictionaryPath}.ORGANIZATION_MISMATCH` });
        } else if (this.replacedByRequest && this.replacedByRequest.employee.id !== this.employee.id) {
            throw Exception.invariantViolation({ messageKey: `${Employment.dictionaryPath}.REQUEST_MISMATCH` });
        }
    }

    private hasOrganizationMismatch(): boolean {
        return [this.employee, this.workCalendar, this.workSchedule, this.leavePolicy, this.replacedByRequest].some(
            (record) => record && record.organization !== this.organization,
        );
    }
}
