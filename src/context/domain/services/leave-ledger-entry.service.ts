import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { LEAVE_LEDGER_ENTRY_REPOSITORY, ORGANIZATION_REPOSITORY } from "~context/infrastructure/repositories";
import { LeaveLedgerKind } from "~context/enums";
import { Exception } from "~common/exceptions";

import { LeaveLedgerEntry } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class LeaveLedgerEntryService implements Services.LeaveLedgerEntry.Contract {
    private readonly dictionaryPath = "services.leave-ledger-entry";

    public constructor(
        @Inject(LEAVE_LEDGER_ENTRY_REPOSITORY)
        private readonly leaveLedgerEntryRepository: Repositories.LeaveLedgerEntry.Contract,
        @Inject(ORGANIZATION_REPOSITORY)
        private readonly organizationRepository: Repositories.Organization.Contract,
    ) {}

    public async create(props: Services.LeaveLedgerEntry.Create.Props): Services.LeaveLedgerEntry.Create.Result {
        const { transaction, organization, input } = props;

        if (input.kind === LeaveLedgerKind.REVERSAL) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.INVALID_REVERSAL` });
        }

        const organizationEntity = await this.organizationRepository.findUniqueOrThrow({
            where: { id: organization },
            transaction,
        });

        const entryEntity = new LeaveLedgerEntry({
            organization: organizationEntity,
            ...input,
        });

        entryEntity.canCreate();

        transaction.persist(entryEntity);

        return entryEntity;
    }

    public async reverse(props: Services.LeaveLedgerEntry.Reverse.Props): Services.LeaveLedgerEntry.Reverse.Result {
        const { transaction, organization, input, id } = props;
        const [organizationEntity, entryEntity] = await Promise.all([
            this.organizationRepository.findUniqueOrThrow({
                where: { id: organization },
                transaction,
            }),
            this.leaveLedgerEntryRepository.findUniqueOrThrow({
                where: { organization, id },
                transaction,
                options: {
                    populate: ["employee", "leavePolicy", "absence", "reversedByEntry"],
                    lockMode: LockMode.PESSIMISTIC_WRITE,
                    strategy: "select-in",
                },
            }),
        ]);

        if (entryEntity.reversedByEntry || entryEntity.kind === LeaveLedgerKind.REVERSAL) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.INVALID_REVERSAL` });
        }

        const reverseDelta = (value: string): string =>
            /^-?0(?:\.0+)?$/.test(value) ? "0" : value.startsWith("-") ? value.slice(1) : `-${value}`;

        const reversalEntity = new LeaveLedgerEntry({
            ...input,
            organization: organizationEntity,
            entitlementPeriodStart: entryEntity.entitlementPeriodStart,
            entitlementPeriodEnd: entryEntity.entitlementPeriodEnd,
            reservedDelta: reverseDelta(entryEntity.reservedDelta),
            calculationSnapshot: { reversedEntry: entryEntity.id },
            balanceDelta: reverseDelta(entryEntity.balanceDelta),
            leavePolicy: entryEntity.leavePolicy,
            kind: LeaveLedgerKind.REVERSAL,
            employee: entryEntity.employee,
            poolCode: entryEntity.poolCode,
            absence: entryEntity.absence,
            reversesEntry: entryEntity,
            unit: entryEntity.unit,
        });

        reversalEntity.canCreate();

        entryEntity.reversedByEntry = reversalEntity;

        transaction.persist(reversalEntity);

        return reversalEntity;
    }
}
