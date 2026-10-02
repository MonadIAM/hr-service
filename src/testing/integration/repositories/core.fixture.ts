import { ChangeSetType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { EntityFactoryRegistry } from "~testing/entity-factory.registry";
import { DeltaChanges } from "~common/transaction-manager/value-objects";
import { ActionType, EntityType } from "~context/enums";

export class CoreFixture implements Fixtures.Core.Contract {
    private readonly entities = new EntityFactoryRegistry();

    public constructor(private readonly entityManager: ORM.EntityManager) {}

    public async createAuditLog(props: Fixtures.Core.CreateAuditLog.Props = {}): Fixtures.Core.CreateAuditLog.Result {
        const auditLog = this.entities.createAuditLog({
            entityType: props.entityType ?? EntityType.EXAMPLE,
            actionType: props.actionType ?? ActionType.CREATE,
            actor: props.actor ?? randomUUID(),
            realm: props.realm ?? randomUUID(),
            input: props.input,
            context: {
                ip: props.context?.ip ?? "127.0.0.1",
                userAgent: props.context?.userAgent ?? "hr-test",
            },
        });

        auditLog.sign({ keyVersion: 1, signature: "test-signature" });
        auditLog.createdAt = props.createdAt ?? auditLog.createdAt;

        return await this.persist(auditLog);
    }

    public async createChangeLog(props: Fixtures.Core.CreateChangeLog.Props = {}): Fixtures.Core.CreateChangeLog.Result {
        const auditEntry = props.auditEntry ?? (await this.createAuditLog());
        const changeLog = this.entities.createChangeLog({
            delta: props.delta ?? new DeltaChanges({ name: { old: null, new: "Updated Name" } }),
            changeType: props.changeType ?? ChangeSetType.CREATE,
            entityType: props.entityType ?? EntityType.EXAMPLE,
            entity: props.entity ?? randomUUID(),
            auditEntry: auditEntry.id,
        });

        changeLog.sign({ keyVersion: 1, signature: "test-signature" });

        return await this.persist(changeLog);
    }

    private async persist<Entity extends ORM.AnyEntity>(entity: Entity): Promise<Entity> {
        this.entityManager.persist(entity);
        await this.entityManager.flush();
        return entity;
    }
}
