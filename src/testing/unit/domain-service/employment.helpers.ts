import { EmploymentService } from "~context/domain/services/employment.service";

import { HRDomainUnitHelpers } from "./core.helpers";

export class EmploymentUnitHelpers extends HRDomainUnitHelpers implements Unit.Domain.Employment.Contract {
    public service(): Unit.Domain.Employment.Service.Result {
        const transaction = this.transaction();
        const repositories = {};
        const services = {};

        return {
            service: new EmploymentService(),
            repositories,
            transaction,
            services,
        };
    }
}
