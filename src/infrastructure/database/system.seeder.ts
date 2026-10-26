import { dataset } from "@monadiam/shared/datasets/system/hr";
import { Seeder } from "@mikro-orm/seeder";

export class System extends Seeder {
    private readonly schema: string = "hr";

    public async run(entityManager: ORM.EntityManager): Promise<void> {
        const platform = entityManager.getPlatform();
        const seedOrder = [
            dataset.Organizations,
            dataset.WorkCalendars,
            dataset.WorkCalendarExceptions,
            dataset.WorkSchedules,
            dataset.LeavePolicies,
            dataset.Employees,
            dataset.Positions,
            dataset.HRRequests,
            dataset.PositionAssignments,
            dataset.Employments,
            dataset.HRApprovalSteps,
            dataset.HRApprovalDecisions,
            dataset.Absences,
            dataset.LeaveLedgerEntries,
        ].filter((table) => table.postgresql.length > 0);

        await entityManager.transactional(async (manager) => {
            await manager.execute(`
                TRUNCATE TABLE
                    hr.organization,
                    hr.work_calendar,
                    hr.work_calendar_exception,
                    hr.work_schedule,
                    hr.leave_policy,
                    hr.employee,
                    hr.position,
                    hr.hr_request,
                    hr.position_assignment,
                    hr.employment,
                    hr.hr_approval_step,
                    hr.hr_approval_decision,
                    hr.absence,
                    hr.leave_ledger_entry,
                    system.outbox,
                    system.change_log,
                    system.audit_log
                RESTART IDENTITY CASCADE
            `);

            for await (const entry of seedOrder) {
                const query = platform
                    .createNativeQueryBuilder()
                    .into(`${this.schema}.${entry.name}`)
                    .insert(entry.postgresql);
                await manager.execute(query, [], "run");
            }
        });
    }
}
