import { ClassProvider } from "@nestjs/common";

import { HR_REQUEST_SCHEDULER, CLEANUP_SCHEDULER } from "./tokens";
import { HRRequestScheduler } from "./hr-request.scheduler";
import { CleanupScheduler } from "./cleanup.scheduler";

export const SCHEDULERS: ClassProvider[] = [
    {
        provide: HR_REQUEST_SCHEDULER,
        useClass: HRRequestScheduler,
    },
    {
        provide: CLEANUP_SCHEDULER,
        useClass: CleanupScheduler,
    },
];

export { HR_REQUEST_SCHEDULER, CLEANUP_SCHEDULER };
