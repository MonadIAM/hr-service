import { Injectable, Inject, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { EMPLOYEE_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class EmployeeCommands implements Commands.Employee.Contract {
    private readonly dictionaryPath = "commands.employee";
    private readonly resource = "Employee";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(EMPLOYEE_SERVICE)
        private readonly employeeService: Services.Employee.CommandContract,
    ) {}

    public async create(props: Commands.Employee.Create.Props): Commands.Employee.Create.Result {
        const { organization, input } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                return this.employeeService.create({
                    transaction,
                    organization,
                    input,
                });
            },
        });

        return { message: `${this.dictionaryPath}.CREATED` };
    }

    public async update(props: Commands.Employee.Update.Props): Commands.Employee.Update.Result {
        const { organization, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.employeeService.update({
                    patch: input.patch,
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.UPDATED` };
    }

    public async linkAccount(props: Commands.Employee.LinkAccount.Props): Commands.Employee.LinkAccount.Result {
        const { organization, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.employeeService.linkAccount({
                    account: input.account,
                    organization,
                    transaction,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.ACCOUNT_LINKED` };
    }

    public async unlinkAccount(props: Commands.Employee.UnlinkAccount.Props): Commands.Employee.UnlinkAccount.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.employeeService.unlinkAccount({
                    organization,
                    transaction,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.ACCOUNT_UNLINKED` };
    }

    public async archive(props: Commands.Employee.Archive.Props): Commands.Employee.Archive.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.employeeService.archive({
                    organization,
                    transaction,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.ARCHIVED` };
    }

    public async restore(props: Commands.Employee.Restore.Props): Commands.Employee.Restore.Result {
        const { organization, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.employeeService.restore({
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.RESTORED` };
    }

    public async setHRBP(props: Commands.Employee.SetHRBP.Props): Commands.Employee.SetHRBP.Result {
        const { organization, input, id } = props;

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.EMPLOYEE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.employeeService.setHRBP({
                    employee: input.employee,
                    transaction,
                    organization,
                    id,
                });
            },
        });

        return { message: `${this.dictionaryPath}.HRBP_UPDATED` };
    }
}
