import { ClassProvider } from "@nestjs/common";

import { CHANGE_LOG_SERVICE, AUDIT_LOG_SERVICE } from "./tokens";
import { ChangeLogService } from "./change-log.service";
import { AuditLogService } from "./audit-log.service";

export const DOMAIN_SERVICES: ClassProvider[] = [
    {
        provide: CHANGE_LOG_SERVICE,
        useClass: ChangeLogService,
    },
    {
        provide: AUDIT_LOG_SERVICE,
        useClass: AuditLogService,
    },
];

export { CHANGE_LOG_SERVICE, AUDIT_LOG_SERVICE };
