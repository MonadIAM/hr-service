import { ChangeSetType } from "@mikro-orm/postgresql";

import { AuditLog, ChangeLog } from "~common/transaction-manager/entities";

export class EntityFactoryRegistry implements Testing.EntityFactory.Contract {
    public createAuditLog(props: Testing.EntityFactory.CreateAuditLog.Props = {}): SystemEntities.AuditLog {
        const { context, ...state } = props;

        return this.entity(
            new AuditLog({
                ...state,
                context: { userAgent: context?.userAgent ?? "unit-agent", ip: context?.ip ?? "127.0.0.1" },
                entityType: props.entityType ?? "EXAMPLE",
                actionType: props.actionType ?? "CREATE",
            }),
            state,
        );
    }

    public createChangeLog(props: Testing.EntityFactory.CreateChangeLog.Props = {}): SystemEntities.ChangeLog {
        return this.entity(
            new ChangeLog({
                ...props,
                auditEntry: props.auditEntry ?? "00000000-0000-4000-8000-0000000000fe",
                entity: props.entity ?? "00000000-0000-4000-8000-0000000000fd",
                changeType: props.changeType ?? ChangeSetType.CREATE,
                entityType: props.entityType ?? "EXAMPLE",
                delta: props.delta ?? {},
            }),
            props,
        );
    }

    private entity<Entity extends object>(entity: Entity, props: Partial<Entity>): Entity {
        Object.assign(entity, props);
        return entity;
    }
}
