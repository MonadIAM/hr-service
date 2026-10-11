declare namespace Unit.Domain.WorkCalendarException {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.WorkCalendarException.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                workCalendarException: Unit.Domain.HR.RepositoryMock<Entities.WorkCalendarException>;
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                workCalendar: Unit.Domain.HR.RepositoryMock<Entities.WorkCalendar>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
