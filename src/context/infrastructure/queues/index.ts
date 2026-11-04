import { Provider } from "@nestjs/common";

import { HR_REQUEST_PROCESSOR, HR_REQUEST_QUEUE, CLEANUP_PROCESSOR, CLEANUP_QUEUE } from "./tokens";
import { HRRequestProcessor, HRRequestQueue } from "./hr-request";
import { CleanupProcessor, CleanupQueue } from "./cleanup";
import { BULLMQ_JOBS_PROVIDER } from "./metrics.provider";

export const QUEUES: Provider[] = [
    BULLMQ_JOBS_PROVIDER,
    {
        provide: HR_REQUEST_PROCESSOR,
        useClass: HRRequestProcessor,
    },
    {
        provide: HR_REQUEST_QUEUE,
        useClass: HRRequestQueue,
    },
    {
        provide: CLEANUP_PROCESSOR,
        useClass: CleanupProcessor,
    },
    {
        provide: CLEANUP_QUEUE,
        useClass: CleanupQueue,
    },
];

export { HR_REQUEST_PROCESSOR, HR_REQUEST_QUEUE, CLEANUP_PROCESSOR, CLEANUP_QUEUE };
export { BullQueue } from "./enums";
