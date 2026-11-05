import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import { Job } from "bullmq";

import { HR_REQUEST_COMMANDS } from "~context/application/commands";

import { HR_REQUEST_QUEUE } from "../tokens";
import { BullQueue } from "../enums";

@Injectable()
@Processor(BullQueue.HR_REQUEST)
export class HRRequestProcessor extends WorkerHost {
    public constructor(
        @Inject(HR_REQUEST_COMMANDS)
        private readonly hrRequestCommands: Commands.HRRequest.ProcessorContract,
        @Inject(HR_REQUEST_QUEUE)
        private readonly hrRequestQueue: Queues.HRRequest.Contract,
    ) {
        super();
    }

    public async process(job: Job<Queues.HRRequest.JobData>): Promise<number> {
        const requests = await this.hrRequestCommands.execute({ batchSize: job.data.batchSize });
        const absences = await this.hrRequestCommands.advanceAbsences({ batchSize: job.data.batchSize });
        const processed = Math.max(requests, absences);

        if (processed === job.data.batchSize) {
            await this.hrRequestQueue.schedule({ ...job.data, batch: job.data.batch + 1 });
        }

        return processed;
    }
}
