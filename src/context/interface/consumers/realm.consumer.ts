import { EventPattern, KafkaContext, Payload, ClientKafka, Ctx } from "@nestjs/microservices";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { RealmTopicAction } from "@monadiam/shared";
import { lastValueFrom } from "rxjs";

import { KAFKA_RETRY_SERVICE, KAFKA_SCHEMA_REGISTRY, KAFKA_SERVICE, KafkaIncomingMapper } from "~infrastructure/kafka";
import { ORGANIZATION_COMMANDS } from "~context/application/commands/tokens";
import { KAFKA_METRICS_RECORDER } from "~observability/metrics/tokens";
import { KafkaTopic } from "~context/enums";

@Controller()
export class RealmConsumer implements Consumers.Realm.Contract, OnModuleInit {
    private readonly logger = new Logger(RealmConsumer.name);
    private readonly incomingMapper = new KafkaIncomingMapper();
    private readonly consumerKey = "hr.realm.v1";

    public constructor(
        @Inject(ORGANIZATION_COMMANDS)
        private readonly organizationCommands: Commands.Organization.ConsumerContract,
        @Inject(KAFKA_METRICS_RECORDER)
        private readonly kafkaMetrics: Observability.Metrics.Kafka.PublicContract,
        @Inject(KAFKA_SCHEMA_REGISTRY)
        private readonly schemaRegistry: Kafka.SchemaRegistry.PublicContract,
        @Inject(KAFKA_RETRY_SERVICE)
        private readonly kafkaRetry: Kafka.Retry.Contract,
        @Inject(KAFKA_SERVICE)
        private readonly kafkaClient: ClientKafka,
    ) {}

    public async onModuleInit(): Promise<void> {
        await this.kafkaClient.connect();
    }

    @EventPattern(KafkaTopic.REALM)
    public async handle(
        @Payload() message: Consumers.Realm.Message,
        @Ctx() context: KafkaContext,
    ): Consumers.Realm.Handle.Result {
        const incoming = {
            consumerKey: this.consumerKey,
            event: this.incomingMapper.reference({ context }),
        };
        await this.kafkaRetry.execute({
            topic: KafkaTopic.REALM,
            heartbeat: context.getHeartbeat(),
            process: () => {
                return this.process({
                    incoming: this.incomingMapper.map({ consumerKey: this.consumerKey, context }),
                    message,
                });
            },
            reject: (error) => {
                return this.reject({ incoming, message, error });
            },
        });
    }

    public async process(props: Consumers.Realm.Process.Props): Consumers.Realm.Process.Result {
        const { incoming } = props;
        const message = await this.schemaRegistry.decode<Consumers.Realm.Message>({
            topic: KafkaTopic.REALM,
            value: props.message,
        });
        this.schemaRegistry.validate({ topic: KafkaTopic.REALM, value: message });
        switch (message.actionType) {
            case RealmTopicAction.BOOTSTRAP_ORGANIZATION_REQUESTED:
                await this.organizationCommands.bootstrap({ incoming, ...message.payload });
                break;
            case RealmTopicAction.SYSTEM_PURGE:
                await this.organizationCommands.purge({ incoming, ...message.payload });
                break;
            default:
                break;
        }
    }

    public async reject(props: Consumers.Realm.Reject.Props): Consumers.Realm.Reject.Result {
        const { incoming, message, error } = props;
        this.logger.warn(`Rejected realm event: ${String(error)}`);

        const decoded = await this.schemaRegistry.decode<Consumers.Realm.Message>({
            topic: KafkaTopic.REALM,
            value: message,
        });

        this.schemaRegistry.validate({ topic: KafkaTopic.REALM, value: decoded });

        if (decoded.actionType === RealmTopicAction.BOOTSTRAP_ORGANIZATION_REQUESTED) {
            await this.organizationCommands.rejectBootstrap({ incoming, request: decoded.payload, reason: String(error) });
        } else if (decoded.actionType === RealmTopicAction.SYSTEM_PURGE) {
            throw error;
        }

        await lastValueFrom(
            this.kafkaClient.emit(KafkaTopic.REALM_DEAD, {
                key: incoming.event,
                value: { originalTopic: KafkaTopic.REALM, error: String(error), payload: message },
            }),
        );

        this.kafkaMetrics.recordDead({ topic: KafkaTopic.REALM, error });
    }
}
