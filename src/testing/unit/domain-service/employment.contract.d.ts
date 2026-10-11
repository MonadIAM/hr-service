declare namespace Unit.Domain.Employment {
    interface Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            transaction: Unit.Domain.Core.Transaction;
            service: Services.Employment.Contract;
            repositories: {};
            services: {};
        };

        type Signature = () => Result;
    }
}
