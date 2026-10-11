import { ChangeLogRepository } from "~context/infrastructure/repositories/change-log.repository";
import { ChangeLogService } from "~context/domain/services/change-log.service";

export class ChangeLogIntegrationHelpers implements Integration.Domain.ChangeLog.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.ChangeLog.Service.Context {
        const repositories = {
            changeLog: new ChangeLogRepository(context.readManager),
        };

        return {
            service: new ChangeLogService(repositories.changeLog),
            repositories,
        };
    }
}
