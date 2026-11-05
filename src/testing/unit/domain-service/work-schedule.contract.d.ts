declare namespace Unit.Domain.WorkSchedule {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.WorkSchedule.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
                workSchedule: Unit.Domain.HR.RepositoryMock<Entities.WorkSchedule>;
                hrRequest: Unit.Domain.HR.RepositoryMock<Entities.HRRequest>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
