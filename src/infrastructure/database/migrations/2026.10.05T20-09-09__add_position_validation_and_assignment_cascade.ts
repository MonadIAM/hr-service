import { Migration } from '@mikro-orm/migrations';

export class Migration20261005200909_add_position_validation_and_assignment_cascade extends Migration {

  override name = 'Migration20261005200909_add_position_validation_and_assignment_cascade';

  override up(): void | Promise<void> {
    this.addSql(`alter table "hr"."hr_request" drop constraint "hr_request_target_position_id_organization_id_foreign";`);

    this.addSql(`alter table "hr"."position_assignment" drop constraint "position_assignment_position_id_organization_id_foreign";`);

    this.addSql(`alter table "hr"."position" add "process" uuid null, add "previous_status" text null;`);
    this.addSql(`alter table "hr"."position" alter column "team_id" set not null;`);

    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_target_position_id_organization_id_foreign" foreign key ("target_position_id", "organization_id") references "hr"."position" ("id", "organization_id") on delete set null ("target_position_id");`);

    this.addSql(`alter table "hr"."position_assignment" add constraint "position_assignment_position_id_organization_id_foreign" foreign key ("position_id", "organization_id") references "hr"."position" ("id", "organization_id") on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "hr"."hr_request" drop constraint "hr_request_target_position_id_organization_id_foreign";`);

    this.addSql(`alter table "hr"."position_assignment" drop constraint "position_assignment_position_id_organization_id_foreign";`);

    this.addSql(`alter table "hr"."hr_request" add constraint "hr_request_target_position_id_organization_id_foreign" foreign key ("target_position_id", "organization_id") references "hr"."position" ("id", "organization_id");`);

    this.addSql(`alter table "hr"."position" drop column "process", drop column "previous_status";`);
    this.addSql(`alter table "hr"."position" alter column "team_id" drop not null;`);

    this.addSql(`alter table "hr"."position_assignment" add constraint "position_assignment_position_id_organization_id_foreign" foreign key ("position_id", "organization_id") references "hr"."position" ("id", "organization_id");`);
  }

}
