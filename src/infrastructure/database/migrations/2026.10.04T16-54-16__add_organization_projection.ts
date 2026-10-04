import { Migration } from '@mikro-orm/migrations';

export class Migration20261004165416_add_organization_projection extends Migration {

  override name = 'Migration20261004165416_add_organization_projection';

  override up(): void | Promise<void> {
    this.addSql(`create table "hr"."organization" ("id" uuid not null, "realm_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "hr"."organization" add constraint "organization_realm_unique" unique ("realm_id");`);

    this.addSql(`alter table "hr"."leave_policy" add constraint "leave_policy_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);

    this.addSql(`alter table "hr"."position" add constraint "position_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);

    this.addSql(`alter table "hr"."work_calendar" add constraint "work_calendar_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);

    this.addSql(`alter table "hr"."work_calendar_exception" add constraint "work_calendar_exception_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);
    this.addSql(`create index "work_calendar_exception_organization_idx" on "hr"."work_calendar_exception" ("organization_id");`);

    this.addSql(`alter table "hr"."work_schedule" add constraint "work_schedule_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);

    this.addSql(`alter table "hr"."employee" add constraint "employee_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);

    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);

    this.addSql(`alter table "hr"."position_assignment" add constraint "position_assignment_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);

    this.addSql(`alter table "hr"."hr_approval_step" add constraint "hr_approval_step_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);

    this.addSql(`alter table "hr"."hr_approval_decision" add constraint "hr_approval_decision_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);
    this.addSql(`create index "hr_approval_decision_organization_idx" on "hr"."hr_approval_decision" ("organization_id");`);

    this.addSql(`alter table "hr"."employment" add constraint "employment_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);
    this.addSql(`create index "employment_organization_idx" on "hr"."employment" ("organization_id");`);

    this.addSql(`alter table "hr"."absence" add constraint "absence_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);

    this.addSql(`alter table "hr"."leave_ledger_entry" add constraint "leave_ledger_entry_organization_id_foreign" foreign key ("organization_id") references "hr"."organization" ("id") on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "hr"."leave_policy" drop constraint "leave_policy_organization_id_foreign";`);
    this.addSql(`alter table "hr"."position" drop constraint "position_organization_id_foreign";`);
    this.addSql(`alter table "hr"."work_calendar" drop constraint "work_calendar_organization_id_foreign";`);
    this.addSql(`alter table "hr"."work_calendar_exception" drop constraint "work_calendar_exception_organization_id_foreign";`);
    this.addSql(`alter table "hr"."work_schedule" drop constraint "work_schedule_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employee" drop constraint "employee_organization_id_foreign";`);
    this.addSql(`alter table "hr"."hr_request" drop constraint "hr_request_organization_id_foreign";`);
    this.addSql(`alter table "hr"."position_assignment" drop constraint "position_assignment_organization_id_foreign";`);
    this.addSql(`alter table "hr"."hr_approval_step" drop constraint "hr_approval_step_organization_id_foreign";`);
    this.addSql(`alter table "hr"."hr_approval_decision" drop constraint "hr_approval_decision_organization_id_foreign";`);
    this.addSql(`alter table "hr"."employment" drop constraint "employment_organization_id_foreign";`);
    this.addSql(`alter table "hr"."absence" drop constraint "absence_organization_id_foreign";`);
    this.addSql(`alter table "hr"."leave_ledger_entry" drop constraint "leave_ledger_entry_organization_id_foreign";`);

    this.addSql(`drop table if exists "hr"."organization" cascade;`);

    this.addSql(`drop index "hr"."employment_organization_idx";`);

    this.addSql(`drop index "hr"."hr_approval_decision_organization_idx";`);

    this.addSql(`drop index "hr"."work_calendar_exception_organization_idx";`);
  }

}
