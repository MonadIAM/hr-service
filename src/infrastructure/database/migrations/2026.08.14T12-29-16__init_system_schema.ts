import { Migration } from '@mikro-orm/migrations';

export class Migration20260814122916_init_system_schema extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create schema if not exists "system";`);
    this.addSql(`create table "system"."audit_log" ("id" uuid not null, "action_type" varchar(64) not null, "entity_type" varchar(64) not null, "realm" uuid null, "actor" uuid null, "ip" inet null, "user_agent" text null, "input" jsonb null, "created_at" timestamptz(3) not null, primary key ("id"));`);
    this.addSql(`create index "audit_log_realm_idx" on "system"."audit_log" ("realm");`);
    this.addSql(`create index "audit_log_actor_created_at_idx" on "system"."audit_log" ("actor", "created_at");`);
    this.addSql(`create index "audit_log_entity_type_action_type_idx" on "system"."audit_log" ("entity_type", "action_type");`);

    this.addSql(`create table "system"."change_log" ("id" uuid not null, "audit_entry_id" uuid not null, "change_type" varchar(16) not null, "entity_type" varchar(64) not null, "entity" uuid not null, "delta" jsonb not null, "created_at" timestamptz(3) not null, primary key ("id"));`);
    this.addSql(`create index "change_log_audit_entry_idx" on "system"."change_log" ("audit_entry_id");`);
    this.addSql(`create index "change_log_entity_type_entity_id_idx" on "system"."change_log" ("entity_type", "entity");`);

    this.addSql(`create table "system"."outbox" ("id" uuid not null, "sequence_number" bigserial, "action_type" varchar(64) not null, "destination_topic" varchar(128) not null, "payload" jsonb not null, "metadata" jsonb null, "created_at" timestamptz(3) not null, primary key ("id"));`);
    this.addSql(`create index "outbox_sequence_number_idx" on "system"."outbox" ("sequence_number");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "system"."audit_log" cascade;`);
    this.addSql(`drop table if exists "system"."change_log" cascade;`);
    this.addSql(`drop table if exists "system"."outbox" cascade;`);

    this.addSql(`drop schema if exists "system";`);
  }

}
