export * from "@monadiam/shared";

export enum ResponseViewType {
    /* eslint-disable prettier/prettier */
    DETAILED = "DETAILED",
    COMPACT  = "COMPACT",
    /* eslint-enable prettier/prettier */
}

/** @public */
export enum QueryMode {
    /* eslint-disable prettier/prettier */
    DEFAULT = "DEFAULT",
    MANAGE  = "MANAGE",
    /* eslint-enable prettier/prettier */
}

export enum EntityType {
    EXAMPLE = "EXAMPLE",
}

export enum ActionType {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
}

export enum CleanupJob {
    /* eslint-disable prettier/prettier */
    CHANGE_LOG = "cleanup-change-log",
    AUDIT_LOG  = "cleanup-audit-log",
    INBOX      = "cleanup-inbox",
    /* eslint-enable prettier/prettier */
}
