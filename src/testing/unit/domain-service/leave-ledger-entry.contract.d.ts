declare namespace Unit.Domain.LeaveLedgerEntry {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.LeaveLedgerEntry.Contract;
            transaction: Unit.Domain.Core.Transaction;
            repositories: {
                leaveLedgerEntry: Unit.Domain.HR.RepositoryMock<Entities.LeaveLedgerEntry>;
                organization: Unit.Domain.HR.RepositoryMock<Entities.Organization>;
            };
            services: {};
        };

        type Signature = () => Result;
    }
}
