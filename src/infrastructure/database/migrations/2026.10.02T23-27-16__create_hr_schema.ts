import { Migration } from '@mikro-orm/migrations';

export class Migration20261002232716_create_hr_schema extends Migration {

  override name = 'Migration20261002232716_create_hr_schema';

  override up(): void | Promise<void> {
    this.addSql(`create schema if not exists "hr";`);
    this.addSql(`create type "hr"."record_status" as enum ('ACTIVE', 'ARCHIVED');`);
    this.addSql(`create type "hr"."day_override" as enum ('WORKDAY', 'DAY_OFF');`);
    this.addSql(`create type "hr"."schedule_pattern" as enum ('WEEKLY', 'CYCLIC');`);
    this.addSql(`create type "hr"."calendar_application" as enum ('APPLY_OVERRIDES', 'KEEP_CYCLE');`);
    this.addSql(`create type "hr"."employee_status" as enum ('DRAFT', 'ACTIVE', 'TERMINATED', 'ARCHIVED');`);
    this.addSql(`create type "hr"."request_type" as enum ('HIRE', 'REHIRE', 'TRANSFER', 'CHANGE_TERMS', 'TERMINATE', 'ABSENCE', 'OVERTIME', 'CANCEL_REQUEST', 'LEAVE_ADJUSTMENT');`);
    this.addSql(`create type "hr"."execution_status" as enum ('NOT_STARTED', 'SCHEDULED', 'RUNNING', 'APPLIED', 'FAILED');`);
    this.addSql(`create type "hr"."request_status" as enum ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CANCELLED');`);
    this.addSql(`create type "hr"."assignment_status" as enum ('ACTIVE', 'CLOSED', 'VOIDED');`);
    this.addSql(`create type "hr"."approval_status" as enum ('WAITING', 'ACTIVE', 'APPROVED', 'REJECTED', 'RETURNED', 'SKIPPED');`);
    this.addSql(`create type "hr"."decision_kind" as enum ('APPROVE', 'REJECT', 'RETURN');`);
    this.addSql(`create type "hr"."leave_unit" as enum ('DAY', 'MINUTE');`);
    this.addSql(`create type "hr"."absence_status" as enum ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');`);
    this.addSql(`create type "hr"."ledger_kind" as enum ('ACCRUAL', 'RESERVE', 'RELEASE', 'CONSUME', 'ADJUSTMENT', 'REVERSAL');`);
    this.addSql(`create table "hr"."leave_policy" ("id" uuid not null, "organization_id" uuid not null, "status" "hr"."record_status" not null default 'ACTIVE', "jurisdiction" text not null, "revision" int not null, "rules" jsonb not null, "code" text not null, "name" text not null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`alter table "hr"."leave_policy" add constraint "leave_policy_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."leave_policy" add constraint "leave_policy_organization_code_revision_unique" unique ("organization_id", "code", "revision");`);

    this.addSql(`create table "hr"."position" ("id" uuid not null, "team_id" uuid null, "organization_id" uuid not null, "department_id" uuid not null, "status" "hr"."record_status" not null default 'ACTIVE', "planned_fte" numeric(5,4) not null, "budget_amount" numeric(18,2) null, "budget_currency" varchar(3) null, "budget_period" text null, "requirements" text null, "description" text null, "grade" text null, "title" text not null, "code" text not null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`create index "position_organization_department_idx" on "hr"."position" ("organization_id", "department_id");`);
    this.addSql(`create index "position_organization_team_idx" on "hr"."position" ("organization_id", "team_id");`);
    this.addSql(`alter table "hr"."position" add constraint "position_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."position" add constraint "position_organization_code_unique" unique ("organization_id", "code");`);

    this.addSql(`create table "hr"."work_calendar" ("id" uuid not null, "organization_id" uuid not null, "status" "hr"."record_status" not null default 'ACTIVE', "verified_through" date null, "region_code" text null, "country_code" varchar(2) not null, "holidays" jsonb not null, "code" text not null, "name" text not null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`alter table "hr"."work_calendar" add constraint "work_calendar_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."work_calendar" add constraint "work_calendar_organization_code_unique" unique ("organization_id", "code");`);

    this.addSql(`create table "hr"."work_calendar_exception" ("id" uuid not null, "organization_id" uuid not null, "workday_override" "hr"."day_override" null, "shortened_by_minutes" smallint null, "holiday_override" boolean null, "source" text null, "name" text null, "date" date not null, "calendar_id" uuid not null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`alter table "hr"."work_calendar_exception" add constraint "work_calendar_exception_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."work_calendar_exception" add constraint "work_calendar_exception_calendar_date_unique" unique ("calendar_id", "organization_id", "date");`);

    this.addSql(`create table "hr"."work_schedule" ("id" uuid not null, "organization_id" uuid not null, "status" "hr"."record_status" not null default 'ACTIVE', "revision" int not null, "code" text not null, "name" text not null, "pattern_type" "hr"."schedule_pattern" not null, "pattern" jsonb not null, "calendar_application" "hr"."calendar_application" not null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`alter table "hr"."work_schedule" add constraint "work_schedule_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."work_schedule" add constraint "work_schedule_organization_code_revision_unique" unique ("organization_id", "code", "revision");`);

    this.addSql(`create table "hr"."employee" ("id" uuid not null, "account_id" uuid null, "organization_id" uuid not null, "status" "hr"."employee_status" not null default 'DRAFT', "employment_started_on" date null, "schedule_anchor_date" date null, "employment_ended_on" date null, "schedule_timezone" text null, "contract_ends_on" date null, "terms_valid_from" date null, "contract_type" text null, "middle_name" text null, "work_email" text null, "employee_number" text not null, "terms_revision" int not null, "first_name" text not null, "last_name" text not null, "work_calendar_id" uuid null, "work_schedule_id" uuid null, "leave_policy_id" uuid null, "hr_bp_employee_id" uuid null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`create index "employee_organization_status_idx" on "hr"."employee" ("organization_id", "status");`);
    this.addSql(`create index "employee_hr_bp_employee_organization_idx" on "hr"."employee" ("hr_bp_employee_id", "organization_id");`);
    this.addSql(`alter table "hr"."employee" add constraint "employee_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."employee" add constraint "employee_organization_employee_number_unique" unique ("organization_id", "employee_number");`);
    this.addSql(`alter table "hr"."employee" add constraint "employee_organization_account_unique" unique ("organization_id", "account_id");`);

    this.addSql(`create table "hr"."hr_request" ("id" uuid not null, "initiator_account_id" uuid not null, "organization_id" uuid not null, "type" "hr"."request_type" not null, "execution_status" "hr"."execution_status" not null default 'NOT_STARTED', "status" "hr"."request_status" not null default 'DRAFT', "approved_revision" int null, "workflow_version" int null, "applied_revision" int null, "workflow_code" text null, "failure" text null, "result" jsonb null, "payload_schema_version" int not null, "idempotency_key" text not null, "revision" int not null, "payload" jsonb not null, "employee_id" uuid not null, "initiator_employee_id" uuid null, "target_position_id" uuid null, "related_request_id" uuid null, "effective_at" timestamptz(3) null, "submitted_at" timestamptz(3) null, "approved_at" timestamptz(3) null, "updated_at" timestamptz(3) null, "applied_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`create index "hr_request_organization_employee_created_at_idx" on "hr"."hr_request" ("organization_id", "employee_id", "created_at");`);
    this.addSql(`create index "hr_request_organization_status_idx" on "hr"."hr_request" ("organization_id", "status");`);
    this.addSql(`create index "hr_request_execution_status_effective_at_idx" on "hr"."hr_request" ("execution_status", "effective_at");`);
    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_id_employee_organization_unique" unique ("id", "employee_id", "organization_id");`);
    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_organization_idempotency_key_unique" unique ("organization_id", "idempotency_key");`);

    this.addSql(`create table "hr"."position_assignment" ("id" uuid not null, "team_id" uuid null, "organization_id" uuid not null, "department_id" uuid not null, "status" "hr"."assignment_status" not null default 'ACTIVE', "fte" numeric(5,4) not null, "salary_amount" numeric(18,2) null, "salary_currency" varchar(3) null, "salary_period" text null, "valid_to" date null, "grade" text null, "placement_snapshot" jsonb not null, "position_title" text not null, "valid_from" date not null, "employee_id" uuid not null, "position_id" uuid not null, "source_request_id" uuid null, "closed_by_request_id" uuid null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`create index "position_assignment_organization_employee_valid_from_idx" on "hr"."position_assignment" ("organization_id", "employee_id", "valid_from");`);
    this.addSql(`create index "position_assignment_organization_position_valid_from_idx" on "hr"."position_assignment" ("organization_id", "position_id", "valid_from");`);
    this.addSql(`CREATE UNIQUE INDEX "position_assignment_active_employee_unique" ON "hr"."position_assignment" (employee_id) WHERE status = 'ACTIVE';`);
    this.addSql(`CREATE UNIQUE INDEX "position_assignment_active_position_unique" ON "hr"."position_assignment" (position_id) WHERE status = 'ACTIVE';`);
    this.addSql(`alter table "hr"."position_assignment" add constraint "position_assignment_id_organization_unique" unique ("id", "organization_id");`);

    this.addSql(`create table "hr"."hr_approval_step" ("id" uuid not null, "organization_id" uuid not null, "status" "hr"."approval_status" not null default 'WAITING', "request_revision" int not null, "ordinal" int not null, "name" text not null, "request_id" uuid not null, "assignee_employee_id" uuid not null, "resolved_at" timestamptz(3) null, "updated_at" timestamptz(3) null, "due_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`create index "hr_approval_step_organization_assignee_employee_status_idx" on "hr"."hr_approval_step" ("organization_id", "assignee_employee_id", "status");`);
    this.addSql(`alter table "hr"."hr_approval_step" add constraint "hr_approval_step_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."hr_approval_step" add constraint "hr_approval_step_request_request_revision_ordinal_unique" unique ("request_id", "organization_id", "request_revision", "ordinal");`);
    this.addSql(`alter table "hr"."hr_approval_step" add constraint "hr_approval_step_id_request_revision_organization_unique" unique ("id", "request_id", "organization_id", "request_revision");`);

    this.addSql(`create table "hr"."hr_approval_decision" ("id" uuid not null, "actor_account_id" uuid not null, "organization_id" uuid not null, "request_id" uuid not null, "decision" "hr"."decision_kind" not null, "comment" text null, "request_revision" integer not null, "step_id" uuid not null, "actor_employee_id" uuid not null, "created_at" timestamptz(3) not null, "decided_at" timestamptz(3) not null, primary key ("id"));`);
    this.addSql(`alter table "hr"."hr_approval_decision" add constraint "hr_approval_decision_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."hr_approval_decision" add constraint "hr_approval_decision_step_unique" unique ("step_id", "request_id", "request_revision", "organization_id");`);

    this.addSql(`create table "hr"."employment" ("id" uuid not null, "organization_id" uuid not null, "terms_snapshot" jsonb not null, "terms_revision" int not null, "valid_from" date not null, "valid_to" date not null, "employee_id" uuid not null, "work_calendar_id" uuid null, "work_schedule_id" uuid null, "leave_policy_id" uuid null, "replaced_by_request_id" uuid null, "created_at" timestamptz(3) not null, primary key ("id"));`);
    this.addSql(`alter table "hr"."employment" add constraint "employment_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."employment" add constraint "employment_employee_terms_revision_unique" unique ("employee_id", "organization_id", "terms_revision");`);

    this.addSql(`create table "hr"."absence" ("id" uuid not null, "organization_id" uuid not null, "unit" "hr"."leave_unit" not null, "status" "hr"."absence_status" not null default 'SCHEDULED', "quantity" numeric(14,6) not null, "start_date" date null, "end_date" date null, "calculation_snapshot" jsonb not null, "source_item_key" text not null, "pool_code" text not null, "timezone" text not null, "employee_id" uuid not null, "source_request_id" uuid not null, "leave_policy_id" uuid not null, "cancelled_by_request_id" uuid null, "updated_at" timestamptz(3) null, "starts_at" timestamptz(3) null, "ends_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`create index "absence_organization_employee_start_date_idx" on "hr"."absence" ("organization_id", "employee_id", "start_date");`);
    this.addSql(`create index "absence_organization_employee_starts_at_idx" on "hr"."absence" ("organization_id", "employee_id", "starts_at");`);
    this.addSql(`alter table "hr"."absence" add constraint "absence_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."absence" add constraint "absence_source_request_source_item_key_unique" unique ("source_request_id", "employee_id", "organization_id", "source_item_key");`);
    this.addSql(`alter table "hr"."absence" add constraint "absence_employee_pool_code_unit_organization_unique" unique ("id", "employee_id", "organization_id", "pool_code", "unit");`);

    this.addSql(`create table "hr"."leave_ledger_entry" ("id" uuid not null, "organization_id" uuid not null, "kind" "hr"."ledger_kind" not null, "unit" hr.leave_unit not null, "reserved_delta" numeric(14,6) not null, "balance_delta" numeric(14,6) not null, "entitlement_period_start" date null, "entitlement_period_end" date null, "calculation_snapshot" jsonb not null, "idempotency_key" text not null, "effective_on" date not null, "pool_code" text not null, "reason" text not null, "employee_id" uuid not null, "leave_policy_id" uuid not null, "source_request_id" uuid null, "absence_id" uuid null, "reverses_entry_id" uuid null, "created_at" timestamptz(3) not null, primary key ("id"));`);
    this.addSql(`create index "leave_ledger_entry_employee_pool_unit_effective_on_idx" on "hr"."leave_ledger_entry" ("organization_id", "employee_id", "pool_code", "unit", "effective_on");`);
    this.addSql(`create index "leave_ledger_entry_source_request_idx" on "hr"."leave_ledger_entry" ("source_request_id", "employee_id", "organization_id");`);
    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_id_organization_unique" unique ("id", "organization_id");`);
    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_organization_idempotency_key_unique" unique ("organization_id", "idempotency_key");`);
    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_id_employee_pool_unit_organization_unique" unique ("id", "employee_id", "organization_id", "pool_code", "unit");`);
    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_reverses_entry_unique" unique ("reverses_entry_id", "employee_id", "pool_code", "unit", "organization_id");`);

    this.addSql(`alter table "hr"."work_calendar_exception" add constraint "work_calendar_exception_calendar_id_organization_id_foreign" foreign key ("calendar_id", "organization_id") references "hr"."work_calendar" ("id", "organization_id") on delete restrict;`);

    this.addSql(`alter table "hr"."employee" add constraint "employee_work_calendar_id_organization_id_foreign" foreign key ("work_calendar_id", "organization_id") references "hr"."work_calendar" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."employee" add constraint "employee_work_schedule_id_organization_id_foreign" foreign key ("work_schedule_id", "organization_id") references "hr"."work_schedule" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."employee" add constraint "employee_leave_policy_id_organization_id_foreign" foreign key ("leave_policy_id", "organization_id") references "hr"."leave_policy" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."employee" add constraint "employee_hr_bp_employee_id_organization_id_foreign" foreign key ("hr_bp_employee_id", "organization_id") references "hr"."employee" ("id", "organization_id") on delete restrict;`);

    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_employee_id_organization_id_foreign" foreign key ("employee_id", "organization_id") references "hr"."employee" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_initiator_employee_id_organization_id_foreign" foreign key ("initiator_employee_id", "organization_id") references "hr"."employee" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_target_position_id_organization_id_foreign" foreign key ("target_position_id", "organization_id") references "hr"."position" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_related_request_id_employee_id_organi_00bf8_foreign" foreign key ("related_request_id", "employee_id", "organization_id") references "hr"."hr_request" ("id", "employee_id", "organization_id") on delete restrict;`);

    this.addSql(`alter table "hr"."position_assignment" add constraint "position_assignment_employee_id_organization_id_foreign" foreign key ("employee_id", "organization_id") references "hr"."employee" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."position_assignment" add constraint "position_assignment_position_id_organization_id_foreign" foreign key ("position_id", "organization_id") references "hr"."position" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."position_assignment" add constraint "position_assignment_source_request_id_employee_i_a72cf_foreign" foreign key ("source_request_id", "employee_id", "organization_id") references "hr"."hr_request" ("id", "employee_id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."position_assignment" add constraint "position_assignment_closed_by_request_id_employe_5d1df_foreign" foreign key ("closed_by_request_id", "employee_id", "organization_id") references "hr"."hr_request" ("id", "employee_id", "organization_id") on delete restrict;`);

    this.addSql(`alter table "hr"."hr_approval_step" add constraint "hr_approval_step_request_id_organization_id_foreign" foreign key ("request_id", "organization_id") references "hr"."hr_request" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."hr_approval_step" add constraint "hr_approval_step_assignee_employee_id_organization_id_foreign" foreign key ("assignee_employee_id", "organization_id") references "hr"."employee" ("id", "organization_id") on delete restrict;`);

    this.addSql(`alter table "hr"."hr_approval_decision" add constraint "hr_approval_decision_step_id_request_id_request__e985b_foreign" foreign key ("step_id", "request_id", "request_revision", "organization_id") references "hr"."hr_approval_step" ("id", "request_id", "request_revision", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."hr_approval_decision" add constraint "hr_approval_decision_actor_employee_id_organization_id_foreign" foreign key ("actor_employee_id", "organization_id") references "hr"."employee" ("id", "organization_id") on delete restrict;`);

    this.addSql(`alter table "hr"."employment" add constraint "employment_employee_id_organization_id_foreign" foreign key ("employee_id", "organization_id") references "hr"."employee" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."employment" add constraint "employment_work_calendar_id_organization_id_foreign" foreign key ("work_calendar_id", "organization_id") references "hr"."work_calendar" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."employment" add constraint "employment_work_schedule_id_organization_id_foreign" foreign key ("work_schedule_id", "organization_id") references "hr"."work_schedule" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."employment" add constraint "employment_leave_policy_id_organization_id_foreign" foreign key ("leave_policy_id", "organization_id") references "hr"."leave_policy" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."employment" add constraint "employment_replaced_by_request_id_employee_id_or_98fa4_foreign" foreign key ("replaced_by_request_id", "employee_id", "organization_id") references "hr"."hr_request" ("id", "employee_id", "organization_id") on delete restrict;`);

    this.addSql(`alter table "hr"."absence" add constraint "absence_employee_id_organization_id_foreign" foreign key ("employee_id", "organization_id") references "hr"."employee" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."absence" add constraint "absence_source_request_id_employee_id_organization_id_foreign" foreign key ("source_request_id", "employee_id", "organization_id") references "hr"."hr_request" ("id", "employee_id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."absence" add constraint "absence_leave_policy_id_organization_id_foreign" foreign key ("leave_policy_id", "organization_id") references "hr"."leave_policy" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."absence" add constraint "absence_cancelled_by_request_id_employee_id_orga_916d2_foreign" foreign key ("cancelled_by_request_id", "employee_id", "organization_id") references "hr"."hr_request" ("id", "employee_id", "organization_id") on delete restrict;`);

    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_employee_id_organization_id_foreign" foreign key ("employee_id", "organization_id") references "hr"."employee" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_leave_policy_id_organization_id_foreign" foreign key ("leave_policy_id", "organization_id") references "hr"."leave_policy" ("id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_source_request_id_employee_id_d2bd6_foreign" foreign key ("source_request_id", "employee_id", "organization_id") references "hr"."hr_request" ("id", "employee_id", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_absence_id_employee_id_pool_c_d3323_foreign" foreign key ("absence_id", "employee_id", "pool_code", "unit", "organization_id") references "hr"."absence" ("id", "employee_id", "pool_code", "unit", "organization_id") on delete restrict;`);
    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_reverses_entry_id_employee_id_a889c_foreign" foreign key ("reverses_entry_id", "employee_id", "pool_code", "unit", "organization_id") references "hr"."leave_ledger_entry" ("id", "employee_id", "pool_code", "unit", "organization_id") on delete restrict;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "hr"."employee" drop constraint "employee_leave_policy_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employment" drop constraint "employment_leave_policy_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."absence" drop constraint "absence_leave_policy_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."leave_ledger_entry" drop constraint "leave_ledger_entry_leave_policy_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."hr_request" drop constraint "hr_request_target_position_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."position_assignment" drop constraint "position_assignment_position_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."work_calendar_exception" drop constraint "work_calendar_exception_calendar_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employee" drop constraint "employee_work_calendar_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employment" drop constraint "employment_work_calendar_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employee" drop constraint "employee_work_schedule_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employment" drop constraint "employment_work_schedule_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employee" drop constraint "employee_hr_bp_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."hr_request" drop constraint "hr_request_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."hr_request" drop constraint "hr_request_initiator_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."position_assignment" drop constraint "position_assignment_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."hr_approval_step" drop constraint "hr_approval_step_assignee_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."hr_approval_decision" drop constraint "hr_approval_decision_actor_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employment" drop constraint "employment_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."absence" drop constraint "absence_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."leave_ledger_entry" drop constraint "leave_ledger_entry_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."hr_request" drop constraint "hr_request_related_request_id_employee_id_organi_00bf8_foreign";`);
    this.addSql(`alter table "hr"."position_assignment" drop constraint "position_assignment_source_request_id_employee_i_a72cf_foreign";`);
    this.addSql(`alter table "hr"."position_assignment" drop constraint "position_assignment_closed_by_request_id_employe_5d1df_foreign";`);
    this.addSql(`alter table "hr"."hr_approval_step" drop constraint "hr_approval_step_request_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employment" drop constraint "employment_replaced_by_request_id_employee_id_or_98fa4_foreign";`);
    this.addSql(`alter table "hr"."absence" drop constraint "absence_source_request_id_employee_id_organization_id_foreign";`);
    this.addSql(`alter table "hr"."absence" drop constraint "absence_cancelled_by_request_id_employee_id_orga_916d2_foreign";`);
    this.addSql(`alter table "hr"."leave_ledger_entry" drop constraint "leave_ledger_entry_source_request_id_employee_id_d2bd6_foreign";`);
    this.addSql(`alter table "hr"."hr_approval_decision" drop constraint "hr_approval_decision_step_id_request_id_request__e985b_foreign";`);
    this.addSql(`alter table "hr"."leave_ledger_entry" drop constraint "leave_ledger_entry_absence_id_employee_id_pool_c_d3323_foreign";`);
    this.addSql(`alter table "hr"."leave_ledger_entry" drop constraint "leave_ledger_entry_reverses_entry_id_employee_id_a889c_foreign";`);

    this.addSql(`drop table if exists "hr"."leave_policy" cascade;`);
    this.addSql(`drop table if exists "hr"."position" cascade;`);
    this.addSql(`drop table if exists "hr"."work_calendar" cascade;`);
    this.addSql(`drop table if exists "hr"."work_calendar_exception" cascade;`);
    this.addSql(`drop table if exists "hr"."work_schedule" cascade;`);
    this.addSql(`drop table if exists "hr"."employee" cascade;`);
    this.addSql(`drop table if exists "hr"."hr_request" cascade;`);
    this.addSql(`drop table if exists "hr"."position_assignment" cascade;`);
    this.addSql(`drop table if exists "hr"."hr_approval_step" cascade;`);
    this.addSql(`drop table if exists "hr"."hr_approval_decision" cascade;`);
    this.addSql(`drop table if exists "hr"."employment" cascade;`);
    this.addSql(`drop table if exists "hr"."absence" cascade;`);
    this.addSql(`drop table if exists "hr"."leave_ledger_entry" cascade;`);

    this.addSql(`drop type "hr"."record_status";`);
    this.addSql(`drop type "hr"."day_override";`);
    this.addSql(`drop type "hr"."schedule_pattern";`);
    this.addSql(`drop type "hr"."calendar_application";`);
    this.addSql(`drop type "hr"."employee_status";`);
    this.addSql(`drop type "hr"."request_type";`);
    this.addSql(`drop type "hr"."execution_status";`);
    this.addSql(`drop type "hr"."request_status";`);
    this.addSql(`drop type "hr"."assignment_status";`);
    this.addSql(`drop type "hr"."approval_status";`);
    this.addSql(`drop type "hr"."decision_kind";`);
    this.addSql(`drop type "hr"."leave_unit";`);
    this.addSql(`drop type "hr"."absence_status";`);
    this.addSql(`drop type "hr"."ledger_kind";`);
    this.addSql(`drop schema if exists "hr";`);
  }

}
