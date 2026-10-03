import { Migration } from "@mikro-orm/migrations";

export class Migration20261003010000 extends Migration {
    public override async up(): Promise<void> {
        this.addSql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
        this.addSql(`CREATE INDEX "employee_full_name_trgm_idx" ON "hr"."employee" USING gin ((last_name || ' ' || first_name || coalesce(' ' || middle_name, '')) gin_trgm_ops);`);
        this.addSql(`CREATE INDEX "employee_employee_number_trgm_idx" ON "hr"."employee" USING gin (employee_number gin_trgm_ops);`);
        this.addSql(`CREATE INDEX "position_title_trgm_idx" ON "hr"."position" USING gin (title gin_trgm_ops);`);
        this.addSql(`CREATE INDEX "position_code_trgm_idx" ON "hr"."position" USING gin (code gin_trgm_ops);`);
        this.addSql(`CREATE INDEX "work_calendar_name_trgm_idx" ON "hr"."work_calendar" USING gin (name gin_trgm_ops);`);
        this.addSql(`CREATE INDEX "work_calendar_code_trgm_idx" ON "hr"."work_calendar" USING gin (code gin_trgm_ops);`);
        this.addSql(`CREATE INDEX "work_schedule_name_trgm_idx" ON "hr"."work_schedule" USING gin (name gin_trgm_ops);`);
        this.addSql(`CREATE INDEX "work_schedule_code_trgm_idx" ON "hr"."work_schedule" USING gin (code gin_trgm_ops);`);
        this.addSql(`CREATE INDEX "leave_policy_name_trgm_idx" ON "hr"."leave_policy" USING gin (name gin_trgm_ops);`);
        this.addSql(`CREATE INDEX "leave_policy_code_trgm_idx" ON "hr"."leave_policy" USING gin (code gin_trgm_ops);`);
    }

    public override async down(): Promise<void> {
        this.addSql(`DROP INDEX IF EXISTS "hr"."leave_policy_code_trgm_idx";`);
        this.addSql(`DROP INDEX IF EXISTS "hr"."leave_policy_name_trgm_idx";`);
        this.addSql(`DROP INDEX IF EXISTS "hr"."work_schedule_code_trgm_idx";`);
        this.addSql(`DROP INDEX IF EXISTS "hr"."work_schedule_name_trgm_idx";`);
        this.addSql(`DROP INDEX IF EXISTS "hr"."work_calendar_code_trgm_idx";`);
        this.addSql(`DROP INDEX IF EXISTS "hr"."work_calendar_name_trgm_idx";`);
        this.addSql(`DROP INDEX IF EXISTS "hr"."position_code_trgm_idx";`);
        this.addSql(`DROP INDEX IF EXISTS "hr"."position_title_trgm_idx";`);
        this.addSql(`DROP INDEX IF EXISTS "hr"."employee_employee_number_trgm_idx";`);
        this.addSql(`DROP INDEX IF EXISTS "hr"."employee_full_name_trgm_idx";`);
    }
}
