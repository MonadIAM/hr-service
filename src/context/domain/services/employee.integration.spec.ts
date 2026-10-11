import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { EmployeeIntegrationHelpers } from "~testing/integration/domain-service/employee.helpers";
import { Employee, Employment, PositionAssignment } from "~context/domain/entities";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { EmployeeStatus, PositionAssignmentStatus } from "~context/enums";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";

const helpers = new EmployeeIntegrationHelpers();

describe("[DomainService] - Employee", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Behavior] - employment lifecycle", () => {
        it("[case] - hires, changes terms and terminates with historical snapshots", async () => {
            // Arrange
            const employee = await suite.fixtures().createEmployee();
            const organization = employee.organization;
            const calendar = await suite.fixtures().createWorkCalendar({ organization });
            const schedule = await suite.fixtures().createWorkSchedule({ organization });
            const policy = await suite.fixtures().createLeavePolicy({ organization });
            const props = { organization: organization.id, id: employee.id };
            const terms = {
                workCalendar: calendar.id,
                workSchedule: schedule.id,
                leavePolicy: policy.id,
                scheduleTimezone: "Europe/London",
                termsValidFrom: "2026-01-01",
                contractType: "permanent",
            };

            // Act
            await suite.transaction((transaction) =>
                suite
                    .repository()
                    .service.hire({ ...props, transaction, input: { ...terms, employmentStartedOn: "2026-01-01" } }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.changeTerms({
                    ...props,
                    transaction,
                    input: { ...terms, termsValidFrom: "2026-04-01", contractType: "fixed-term" },
                }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.terminate({ ...props, transaction, input: { employmentEndedOn: "2026-07-01" } }),
            );
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Employee, { id: employee.id }),
            );
            const history = await suite.transaction((transaction) =>
                transaction.find(Employment, { employee: { id: employee.id } }, { orderBy: { termsRevision: "ASC" } }),
            );

            // Assert
            expect(persisted).toMatchObject({
                status: EmployeeStatus.TERMINATED,
                termsRevision: 3,
                employmentEndedOn: "2026-07-01",
            });
            expect(
                history.map((entry) => [
                    entry.termsRevision,
                    entry.validFrom,
                    entry.validTo,
                    entry.termsSnapshot.contractType,
                ]),
            ).toEqual([
                [1, "2026-01-01", "2026-04-01", "permanent"],
                [2, "2026-04-01", "2026-07-01", "fixed-term"],
            ]);
            expect(
                history.every(
                    (entry) =>
                        entry.workCalendar?.id === calendar.id &&
                        entry.workSchedule?.id === schedule.id &&
                        entry.leavePolicy?.id === policy.id,
                ),
            ).toBe(true);
        });

        it("[case] - rolls back termination and history if an assignment cannot close", async () => {
            // Arrange
            const employee = await suite.fixtures().createEmployee({
                status: EmployeeStatus.ACTIVE,
                employmentStartedOn: "2026-01-01",
                termsValidFrom: "2026-01-01",
            });
            const assignment = await suite.fixtures().createPositionAssignment({ employee, validFrom: "2026-08-01" });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.terminate({
                    organization: employee.organization.id,
                    id: employee.id,
                    transaction,
                    input: { employmentEndedOn: "2026-07-01" },
                }),
            );

            // Assert
            await expect(result).rejects.toThrow("entities.position-assignment.INVALID_PERIOD");
            expect(
                (await suite.transaction((transaction) => transaction.findOneOrFail(Employee, { id: employee.id }))).status,
            ).toBe(EmployeeStatus.ACTIVE);
            expect(
                (
                    await suite.transaction((transaction) =>
                        transaction.findOneOrFail(PositionAssignment, { id: assignment.id }),
                    )
                ).status,
            ).toBe(PositionAssignmentStatus.ACTIVE);
            expect(await suite.transaction((transaction) => transaction.count(Employment, {}))).toBe(0);
        });

        it("[case] - rejects hiring with terms from another organization", async () => {
            // Arrange
            const employee = await suite.fixtures().createEmployee();
            const calendar = await suite.fixtures().createWorkCalendar();
            const schedule = await suite.fixtures().createWorkSchedule({ organization: employee.organization });
            const policy = await suite.fixtures().createLeavePolicy({ organization: employee.organization });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.hire({
                    organization: employee.organization.id,
                    id: employee.id,
                    transaction,
                    input: {
                        workCalendar: calendar.id,
                        workSchedule: schedule.id,
                        leavePolicy: policy.id,
                        scheduleTimezone: "Europe/London",
                        termsValidFrom: "2026-01-01",
                        employmentStartedOn: "2026-01-01",
                    },
                }),
            );

            // Assert
            await expect(result).rejects.toThrow();
            expect(
                (await suite.transaction((transaction) => transaction.findOneOrFail(Employee, { id: employee.id }))).status,
            ).toBe(EmployeeStatus.DRAFT);
        });
    });

    describe("[Behavior] - employee record", () => {
        it("[case] - creates and updates a draft and persists account linking", async () => {
            // Arrange
            const organization = await suite.fixtures().createOrganization();
            const account = randomUUID();

            // Act
            const employee = await suite.transaction((transaction) =>
                suite.repository().service.create({
                    organization: organization.id,
                    transaction,
                    input: { employeeNumber: "EMP-1", firstName: "Alice", lastName: "Morgan" },
                }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.update({
                    organization: organization.id,
                    id: employee.id,
                    transaction,
                    patch: { firstName: "Updated" },
                }),
            );
            await suite.transaction((transaction) =>
                suite
                    .repository()
                    .service.linkAccount({ organization: organization.id, id: employee.id, account, transaction }),
            );
            const linked = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Employee, { id: employee.id }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.unlinkAccount({ organization: organization.id, id: employee.id, transaction }),
            );
            const unlinked = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Employee, { id: employee.id }),
            );

            // Assert
            expect(linked).toMatchObject({ firstName: "Updated", account, status: EmployeeStatus.DRAFT });
            expect(unlinked.account).toBeFalsy();
        });
    });
});
