import { Seeder } from "@mikro-orm/seeder";

export class System extends Seeder {
    public async run(entityManager: ORM.EntityManager): Promise<void> {
        await entityManager.getConnection().execute(`
            TRUNCATE TABLE
                system.outbox,
                system.change_log,
                system.audit_log
            RESTART IDENTITY CASCADE
        `);
    }
}
