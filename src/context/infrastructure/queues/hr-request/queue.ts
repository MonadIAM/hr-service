import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

import { BullQueue } from "../enums";

@Injectable()
export class HRRequestQueue implements Queues.HRRequest.Contract, OnModuleInit {
    public constructor(
        @InjectQueue(BullQueue.HR_REQUEST)
        private readonly queue: Queue<Queues.HRRequest.JobData>,
    ) {}

    public async onModuleInit(): Promise<void> {
        await this.queue.setGlobalConcurrency(1);
    }

    public async schedule(props: Queues.HRRequest.Schedule.Props): Queues.HRRequest.Schedule.Result {
        await this.queue.add("terminate", props, {
            jobId: `${props.event}.${props.batch}`,
            removeOnComplete: true,
        });
    }
}
