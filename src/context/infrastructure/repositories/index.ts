import { ClassProvider } from "@nestjs/common";

import { CHANGE_LOG_REPOSITORY, AUDIT_LOG_REPOSITORY } from "./tokens";
import { ChangeLogRepository } from "./change-log.repository";
import { AuditLogRepository } from "./audit-log.repository";

export const REPOSITORIES: ClassProvider[] = [
    {
        provide: CHANGE_LOG_REPOSITORY,
        useClass: ChangeLogRepository,
    },
    {
        provide: AUDIT_LOG_REPOSITORY,
        useClass: AuditLogRepository,
    },
];

export { CHANGE_LOG_REPOSITORY, AUDIT_LOG_REPOSITORY };
