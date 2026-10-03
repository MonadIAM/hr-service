import { Injectable, Inject, Scope } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";

import { LEAVE_LEDGER_ENTRY_REPOSITORY } from "~context/infrastructure/repositories";
import { LeaveLedgerKind } from "~context/enums";
import { Exception } from "~common/exceptions";

import { LeaveLedgerEntry } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class LeaveLedgerEntryService implements Services.LeaveLedgerEntry.Contract {
    private readonly dictionaryPath = "services.leave-ledger-entry";

    public constructor(
        @Inject(LEAVE_LEDGER_ENTRY_REPOSITORY)
        private readonly leaveLedgerEntryRepository: Repositories.LeaveLedgerEntry.Contract,
    ) {}

    public create(props: Services.LeaveLedgerEntry.Create.Props): Services.LeaveLedgerEntry.Create.Result {
        const { transaction, organization, input } = props;

        if (input.kind === LeaveLedgerKind.REVERSAL) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.INVALID_REVERSAL` });
        }

        const entity = new LeaveLedgerEntry({
            ...input,
            organization,
        });

        entity.canCreate();

        transaction.persist(entity);

        return entity;
    }

    public async reverse(props: Services.LeaveLedgerEntry.Reverse.Props): Services.LeaveLedgerEntry.Reverse.Result {
        const { transaction, organization, input, id } = props;
        const entity = await this.leaveLedgerEntryRepository.findUniqueOrThrow({
            where: { organization, id },
            transaction,
            options: {
                populate: ["employee", "leavePolicy", "absence", "reversedByEntry"],
                lockMode: LockMode.PESSIMISTIC_WRITE,
                strategy: "select-in",
            },
        });

        if (entity.reversedByEntry || entity.kind === LeaveLedgerKind.REVERSAL) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.INVALID_REVERSAL` });
        }

        const reverseDelta = (value: string): string =>
            /^-?0(?:\.0+)?$/.test(value) ? "0" : value.startsWith("-") ? value.slice(1) : `-${value}`;

        const reversal = new LeaveLedgerEntry({
            ...input,
            entitlementPeriodStart: entity.entitlementPeriodStart,
            entitlementPeriodEnd: entity.entitlementPeriodEnd,
            reservedDelta: reverseDelta(entity.reservedDelta),
            calculationSnapshot: { reversedEntry: entity.id },
            balanceDelta: reverseDelta(entity.balanceDelta),
            leavePolicy: entity.leavePolicy,
            kind: LeaveLedgerKind.REVERSAL,
            employee: entity.employee,
            poolCode: entity.poolCode,
            absence: entity.absence,
            reversesEntry: entity,
            unit: entity.unit,
            organization,
        });

        reversal.canCreate();

        entity.reversedByEntry = reversal;

        transaction.persist(reversal);

        return reversal;
    }
}
