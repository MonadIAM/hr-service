declare namespace Entities {
    type Employment = Employment.Contract;

    namespace Employment {
        interface Contract {
            id: string;
            createdAt: Date;

            termsSnapshot: UnknownObject;
            termsRevision: number;
            validFrom: string;
            validTo: string;

            replacedByRequest?: Entities.HRRequest;
            workCalendar?: Entities.WorkCalendar;
            workSchedule?: Entities.WorkSchedule;
            organization: Entities.Organization;
            leavePolicy?: Entities.LeavePolicy;
            employee: Entities.Employee;

            canCreate(): void;
        }

        type ConstructorProps = {
            termsSnapshot: UnknownObject;
            termsRevision: number;
            validFrom: string;
            validTo: string;

            replacedByRequest?: Entities.HRRequest;
            workCalendar?: Entities.WorkCalendar;
            workSchedule?: Entities.WorkSchedule;
            organization: Entities.Organization;
            leavePolicy?: Entities.LeavePolicy;
            employee: Entities.Employee;
        };
    }
}
