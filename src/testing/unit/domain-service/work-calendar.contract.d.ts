declare namespace Unit.Domain.WorkCalendar {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.WorkCalendar.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                workCalendar: Unit.Domain.HR.RepositoryMock<Entities.WorkCalendar>;
                hrRequest: Unit.Domain.HR.RepositoryMock<Entities.HRRequest>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
