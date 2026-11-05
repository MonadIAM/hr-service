import { Migration } from '@mikro-orm/migrations';

export class Migration20261105030411_add_hire_reservations extends Migration {

  override name = 'Migration20261105030411_add_hire_reservations';

  override up(): void | Promise<void> {
    this.addSql(`alter table "hr"."position" add "reservation" uuid null;`);

    this.addSql(`alter table "hr"."employee" add "reservation" uuid null;`);

    this.addSql(`drop index "hr"."position_assignment_active_employee_unique";`);
    this.addSql(`drop index "hr"."position_assignment_active_position_unique";`);
    this.addSql(`alter table "hr"."position_assignment" alter column "status" drop default;`);
    this.addSql(`alter type "hr"."assignment_status" rename to "assignment_status_old";`);
    this.addSql(`create type "hr"."assignment_status" as enum ('RESERVED', 'ACTIVE', 'CLOSED', 'VOIDED');`);
    this.addSql(`alter table "hr"."position_assignment" alter column "status" type "hr"."assignment_status" using "status"::text::"hr"."assignment_status";`);
    this.addSql(`drop type "hr"."assignment_status_old";`);
    this.addSql(`alter table "hr"."position_assignment" alter column "status" set default 'ACTIVE';`);
    this.addSql(`create unique index "position_assignment_active_employee_unique" on "hr"."position_assignment" (employee_id) where status in ('ACTIVE', 'RESERVED');`);
    this.addSql(`create unique index "position_assignment_active_position_unique" on "hr"."position_assignment" (position_id) where status in ('ACTIVE', 'RESERVED');`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "hr"."position_assignment_active_employee_unique";`);
    this.addSql(`drop index "hr"."position_assignment_active_position_unique";`);
    this.addSql(`alter table "hr"."position_assignment" alter column "status" drop default;`);
    this.addSql(`alter type "hr"."assignment_status" rename to "assignment_status_old";`);
    this.addSql(`create type "hr"."assignment_status" as enum ('ACTIVE', 'CLOSED', 'VOIDED');`);
    this.addSql(`alter table "hr"."position_assignment" alter column "status" type "hr"."assignment_status" using "status"::text::"hr"."assignment_status";`);
    this.addSql(`drop type "hr"."assignment_status_old";`);
    this.addSql(`alter table "hr"."position_assignment" alter column "status" set default 'ACTIVE';`);
    this.addSql(`create unique index "position_assignment_active_employee_unique" on "hr"."position_assignment" (employee_id) where status = 'ACTIVE';`);
    this.addSql(`create unique index "position_assignment_active_position_unique" on "hr"."position_assignment" (position_id) where status = 'ACTIVE';`);
    this.addSql(`alter table "hr"."employee" drop column "reservation";`);
    this.addSql(`alter table "hr"."position" drop column "reservation";`);
  }

}
