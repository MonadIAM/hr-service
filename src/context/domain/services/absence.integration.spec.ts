import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { AbsenceIntegrationHelpers } from "~testing/integration/domain-service/absence.helpers";
import { AbsenceStatus, HRRequestStatus, HRRequestType } from "~context/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { HRFixture } from "~testing/integration/repositories/hr.fixture";
import { Absence } from "~context/domain/entities";

const helpers = new AbsenceIntegrationHelpers();

describe("[DomainService] - Absence", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new HRFixture(entityManager),
    });

    describe("[Behavior] - absence lifecycle", () => {
        it("[case] - persists creation and time-based status transitions", async () => {
            // Arrange
            const entity = await suite.fixtures().createAbsence();

            // Act
            const created = await suite.transaction((transaction) =>
                suite.repository().service.create({
                    organization: entity.organization.id,
                    transaction,
                    input: { ...entity, sourceItemKey: randomUUID() },
                }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.advanceStatus({
                    organization: entity.organization.id,
                    id: created.id,
                    at: new Date("2026-07-02T12:00:00Z"),
                    transaction,
                }),
            );
            const started = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Absence, { id: created.id }),
            );
            await suite.transaction((transaction) =>
                suite.repository().service.advanceStatus({
                    organization: entity.organization.id,
                    id: created.id,
                    at: new Date("2026-07-06T12:00:00Z"),
                    transaction,
                }),
            );
            const completed = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Absence, { id: created.id }),
            );

            // Assert
            expect(started.status).toBe(AbsenceStatus.IN_PROGRESS);
            expect(completed.status).toBe(AbsenceStatus.COMPLETED);
        });

        it.each([true, false])("[case] - accepts only an approved cancellation (approved: %s)", async (approved) => {
            // Arrange
            const entity = await suite.fixtures().createAbsence();
            const request = await suite.fixtures().createHRRequest({
                employee: entity.employee,
                relatedRequest: entity.sourceRequest,
                type: HRRequestType.CANCEL_REQUEST,
                status: approved ? HRRequestStatus.APPROVED : HRRequestStatus.DRAFT,
                approvedRevision: approved ? 1 : undefined,
            });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().service.cancel({
                    organization: entity.organization.id,
                    id: entity.id,
                    request: request.id,
                    transaction,
                }),
            );

            // Assert
            if (approved) {
                await expect(result).resolves.toMatchObject({ status: AbsenceStatus.CANCELLED });
            } else {
                await expect(result).rejects.toThrow("entities.absence.INVALID_REQUEST_STATUS");
            }
            const persisted = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Absence, { id: entity.id }),
            );
            expect(persisted.status).toBe(approved ? AbsenceStatus.CANCELLED : AbsenceStatus.SCHEDULED);
            expect(persisted.cancelledByRequest?.id).toBe(approved ? request.id : undefined);
        });
    });
});
