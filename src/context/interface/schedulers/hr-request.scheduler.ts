import { Cron, CronExpression } from "@nestjs/schedule";
import { Inject, Injectable } from "@nestjs/common";

import { HR_REQUEST_QUEUE } from "~context/infrastructure/queues";

@Injectable()
export class HRRequestScheduler {
    private readonly batchSize = 100;

    public constructor(
        @Inject(HR_REQUEST_QUEUE)
        private readonly hrRequestQueue: Queues.HRRequest.Contract,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    public async scheduleExecution(): Promise<void> {
        const now = new Date();
        await this.hrRequestQueue.schedule({
            event: `execute.${Math.floor(now.getTime() / 60_000)}`,
            batchSize: this.batchSize,
            batch: 0,
        });
    }
}
