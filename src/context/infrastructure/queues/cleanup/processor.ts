import { Inject, Injectable, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { INBOX_SERVICE, TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { AUDIT_LOG_SERVICE, CHANGE_LOG_SERVICE } from "~context/domain/services";
import { CleanupJob } from "~context/enums";

import { CLEANUP_QUEUE } from "../tokens";
import { BullQueue } from "../enums";

@Injectable()
@Processor(BullQueue.CLEANUP)
export class CleanupProcessor extends WorkerHost {
    private readonly logger = new Logger(CleanupProcessor.name);

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(INBOX_SERVICE)
        private readonly inboxService: TransactionManager.Inbox.ProcessorContract,
        @Inject(AUDIT_LOG_SERVICE)
        private readonly auditLogService: Services.AuditLog.Contract,
        @Inject(CHANGE_LOG_SERVICE)
        private readonly changeLogService: Services.ChangeLog.Contract,
        @Inject(CLEANUP_QUEUE)
        private readonly cleanupQueue: Queues.Cleanup.Contract,
    ) {
        super();
    }

    private readonly handlers: Record<CleanupJob, Queues.Cleanup.Handler> = {
        [CleanupJob.CHANGE_LOG]: (job: Job) => this.cleanupChangeLog(job),
        [CleanupJob.AUDIT_LOG]: (job: Job) => this.cleanupAuditLog(job),
        [CleanupJob.INBOX]: (job: Job) => this.cleanupInbox(job),
    };

    public process(job: Job): Promise<Queues.Cleanup.Result> {
        return this.handlers[job.name as CleanupJob]?.(job);
    }

    private async cleanupAuditLog(job: Job<Queues.Cleanup.JobData>): Promise<Queues.Cleanup.Result> {
        const { expirationDate: expirationTimestamp, batchSize } = job.data;
        const expirationDate = new Date(expirationTimestamp);
        this.logger.log(`Cleaning up audit log entries older than ${expirationDate.toISOString()}`);

        try {
            const purged = await this.transactionalService.run({
                resource: "AuditLog",
                execute: (transaction) => this.auditLogService.purgeExpired({ transaction, expirationDate, batchSize }),
            });

            if (purged.length) {
                this.logger.log(`Deleted ${purged.length} audit log entries.`);
                return this.scheduleNextBatch(job, purged.length === batchSize);
            } else {
                this.logger.log("No audit log entries to clean up.");
                return { deleted: 0, nextBatch: false };
            }
        } catch (error) {
            this.logger.error("Failed to clean up audit log entries", error);
            throw error;
        }
    }

    private async cleanupChangeLog(job: Job<Queues.Cleanup.JobData>): Promise<Queues.Cleanup.Result> {
        const { expirationDate: expirationTimestamp, batchSize } = job.data;
        const expirationDate = new Date(expirationTimestamp);
        this.logger.log(`Cleaning up change log entries older than ${expirationDate.toISOString()}`);

        try {
            const purged = await this.transactionalService.run({
                resource: "ChangeLog",
                execute: (transaction) => this.changeLogService.purgeExpired({ transaction, expirationDate, batchSize }),
            });

            if (purged.length) {
                this.logger.log(`Deleted ${purged.length} change log entries.`);
                return this.scheduleNextBatch(job, purged.length === batchSize);
            } else {
                this.logger.log("No change log entries to clean up.");
                return { deleted: 0, nextBatch: false };
            }
        } catch (error) {
            this.logger.error("Failed to clean up change log entries", error);
            throw error;
        }
    }

    private async cleanupInbox(job: Job<Queues.Cleanup.RetentionJobData>): Promise<Queues.Cleanup.Result> {
        const { expirationDate: expirationTimestamp, batchSize } = job.data;
        const expirationDate = new Date(expirationTimestamp);
        this.logger.log(`Cleaning up inbox entries older than ${expirationDate.toISOString()}`);

        try {
            let cleaned = 0;
            await this.transactionalService.run({
                resource: "Inbox",
                execute: async (transaction) => {
                    cleaned = await this.inboxService.clean({ transaction, expirationDate, batchSize });
                },
            });

            if (cleaned) {
                this.logger.log(`Deleted ${cleaned} inbox entries.`);
                return this.scheduleNextBatch(job, cleaned === batchSize);
            } else {
                this.logger.log("No inbox entries to clean up.");
                return { deleted: 0, nextBatch: false };
            }
        } catch (error) {
            this.logger.error("Failed to clean up inbox entries", error);
            throw error;
        }
    }

    private async scheduleNextBatch(job: Job<Queues.Cleanup.JobData>, hasMore: boolean): Promise<Queues.Cleanup.Result> {
        if (hasMore) {
            await this.cleanupQueue.scheduleNextBatch({ job: job.name as CleanupJob, data: job.data });
            this.logger.log("Next batch scheduled in 5 seconds...");
        }
        return { deleted: 0, nextBatch: hasMore };
    }
}
