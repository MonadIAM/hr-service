import { Injectable, Inject, Scope } from "@nestjs/common";

import { HR_REQUEST_EXECUTION_SERVICE, HR_REQUEST_SERVICE } from "~context/domain/services";
import { HR_REQUEST_REPOSITORY } from "~context/infrastructure/repositories";
import { SYSTEM_ACCOUNT_ID, CONSUMER_META } from "~context/constants";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import {
    HRExecutionStatus,
    RealmTopicAction,
    HRRequestStatus,
    HRRequestType,
    ActionType,
    EntityType,
    KafkaTopic,
} from "~context/enums";

import { HRRequestMapper } from "../mappers/hr-request.mapper";

@Injectable({ scope: Scope.DEFAULT })
export class HRRequestCommands implements Commands.HRRequest.Contract {
    private readonly mapper: Commands.Mappers.HRRequest.Contract;
    private readonly dictionaryPath = "commands.hr-request";
    private readonly resource = "HRRequest";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(HR_REQUEST_EXECUTION_SERVICE)
        private readonly hrRequestExecutionService: Services.HRRequestExecution.Contract,
        @Inject(HR_REQUEST_SERVICE)
        private readonly hrRequestService: Services.HRRequest.CommandContract,
        @Inject(HR_REQUEST_REPOSITORY)
        private readonly hrRequestRepository: Repositories.HRRequest.Contract,
    ) {
        this.mapper = new HRRequestMapper();
    }

    public async execute(props: Commands.HRRequest.Execute.Props): Commands.HRRequest.Execute.Result {
        const requests = await this.hrRequestRepository.find({
            options: { orderBy: { createdAt: "ASC" }, limit: props.batchSize },
            where: {
                executionStatus: { $in: [HRExecutionStatus.NOT_STARTED, HRExecutionStatus.SCHEDULED] },
                $or: [{ effectiveAt: { $lte: new Date() } }, { effectiveAt: null }],
                status: HRRequestStatus.APPROVED,
                type: {
                    $in: [
                        HRRequestType.LEAVE_ADJUSTMENT,
                        HRRequestType.CHANGE_TERMS,
                        HRRequestType.TERMINATE,
                        HRRequestType.TRANSFER,
                        HRRequestType.REHIRE,
                        HRRequestType.HIRE,
                    ],
                },
            },
        });

        if (requests.length) {
            const leaveAdjustmentIdentifiers = new Set<string>();
            const changeTermsIdentifiers = new Set<string>();
            const terminationIdentifiers = new Set<string>();
            const transferIdentifiers = new Set<string>();
            const hireIdentifiers = new Set<string>();

            for (const { type, id } of requests) {
                switch (type) {
                    case HRRequestType.LEAVE_ADJUSTMENT:
                        leaveAdjustmentIdentifiers.add(id);
                        break;
                    case HRRequestType.CHANGE_TERMS:
                        changeTermsIdentifiers.add(id);
                        break;
                    case HRRequestType.TERMINATE:
                        terminationIdentifiers.add(id);
                        break;
                    case HRRequestType.TRANSFER:
                        transferIdentifiers.add(id);
                        break;
                    case HRRequestType.REHIRE:
                    case HRRequestType.HIRE:
                        hireIdentifiers.add(id);
                        break;
                }
            }

            let processed = 0;
            await this.transactionalService.run({
                resource: this.resource,
                outbox: [
                    {
                        payloadMapper: this.mapper.leavePayload,
                        actionType: RealmTopicAction.MEMBERSHIP_LEAVE_REQUESTED,
                        destinationTopic: KafkaTopic.REALM,
                    },
                    {
                        payloadMapper: this.mapper.hirePayload,
                        actionType: RealmTopicAction.MEMBERSHIP_ENSURE_REQUESTED,
                        destinationTopic: KafkaTopic.REALM,
                    },
                ],
                audit: {
                    actor: SYSTEM_ACCOUNT_ID,
                    entityType: EntityType.HR_REQUEST,
                    actionType: ActionType.UPDATE,
                    input: {
                        identifiers: requests.map(({ id }) => id),
                    },
                    context: {
                        userAgent: "scheduler",
                        ip: "127.0.0.1",
                    },
                },
                changeLog: true,
                execute: async (transaction) => {
                    await this.hrRequestExecutionService.changeTerms({
                        identifiers: Array.from(changeTermsIdentifiers),
                        transaction,
                    });
                    await this.hrRequestExecutionService.adjustLeave({
                        identifiers: Array.from(leaveAdjustmentIdentifiers),
                        transaction,
                    });
                    await this.hrRequestExecutionService.transfer({
                        identifiers: Array.from(transferIdentifiers),
                        transaction,
                    });
                    const entities = await this.hrRequestExecutionService.beginLeave({
                        identifiers: Array.from(terminationIdentifiers),
                        transaction,
                    });
                    const hires = await this.hrRequestExecutionService.beginHire({
                        identifiers: Array.from(hireIdentifiers),
                        transaction,
                    });
                    processed = requests.length;
                    return { requests: [...entities, ...hires] };
                },
            });

            return processed;
        } else {
            return 0;
        }
    }

    public async completeHire(props: Commands.HRRequest.CompleteHire.Props): Commands.HRRequest.CompleteHire.Result {
        const { incoming, ...request } = props;

        await this.transactionalService.consume({
            incoming,
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.UPDATE,
                context: CONSUMER_META,
                ...request,
            },
            changeLog: true,
            execute: (transaction) => {
                return this.hrRequestExecutionService.completeHire({ ...request, transaction });
            },
        });
    }

    public async confirmLeave(props: Commands.HRRequest.ConfirmLeave.Props): Commands.HRRequest.ConfirmLeave.Result {
        const { incoming, ...request } = props;

        await this.transactionalService.consume({
            incoming,
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.UPDATE,
                context: CONSUMER_META,
                ...request,
            },
            changeLog: true,
            execute: (transaction) => {
                return this.hrRequestExecutionService.confirmLeave({ ...request, transaction });
            },
        });
    }

    public async rejectLeave(props: Commands.HRRequest.RejectLeave.Props): Commands.HRRequest.RejectLeave.Result {
        const { incoming, ...request } = props;

        await this.transactionalService.consume({
            incoming,
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.UPDATE,
                context: CONSUMER_META,
                ...request,
            },
            changeLog: true,
            execute: (transaction) => {
                return this.hrRequestExecutionService.rejectLeave({ ...request, transaction });
            },
        });
    }

    public async create(props: Commands.HRRequest.Create.Props): Commands.HRRequest.Create.Result {
        const { organization, permissions, realm, actor, input } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrRequestService.create({
                    organization,
                    permissions,
                    transaction,
                    input,
                    realm,
                    actor,
                });
            },
        });

        return { message: `${this.dictionaryPath}.CREATED` };
    }

    public async update(props: Commands.HRRequest.Update.Props): Commands.HRRequest.Update.Result {
        const { organization, permissions, actor, realm, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrRequestService.update({
                    patch: input.patch,
                    organization,
                    permissions,
                    transaction,
                    actor,
                    realm,
                    type: input.type,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.UPDATED` };
    }

    public async submit(props: Commands.HRRequest.Submit.Props): Commands.HRRequest.Submit.Result {
        const { organization, permissions, actor, realm, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrRequestService.submit({
                    organization,
                    permissions,
                    transaction,
                    actor,
                    realm,
                    input,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.SUBMITTED` };
    }

    public async withdraw(props: Commands.HRRequest.Withdraw.Props): Commands.HRRequest.Withdraw.Result {
        const { organization, permissions, actor, realm, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.HR_REQUEST,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.hrRequestService.withdraw({
                    organization,
                    permissions,
                    transaction,
                    realm,
                    actor,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.WITHDRAWN` };
    }
}
