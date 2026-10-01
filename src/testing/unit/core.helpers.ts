import { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";

import { EntityFactoryRegistry } from "~testing/entity-factory.registry";

export class DomainServiceCoreUnitHelpers extends EntityFactoryRegistry implements Unit.Domain.Core.Contract {
    public transaction(): Unit.Domain.Core.Transaction {
        const flush = jest.fn(() => Promise.resolve());
        const persist = jest.fn<(entity: object) => void>();
        const remove = jest.fn();
        const clear = jest.fn();
        const merge = jest.fn();

        return {
            entityManager: this.contract<ORM.EntityManager>({ persist, remove, flush, clear, merge }),
            persist,
            remove,
            flush,
            clear,
            merge,
        };
    }

    public config(props: Unit.Domain.Core.Config.Props = {}): ConfigService {
        return this.contract<ConfigService>({
            getOrThrow: jest.fn((key: string) => props.values?.[key]),
        });
    }

    public createExample(props: Unit.Domain.Core.CreateExample.Props = {}): Unit.Domain.Core.CreateExample.Result {
        return this.contract<ORM.AnyEntity>({
            id: "00000000-0000-4000-8000-0000000000ff",
            ...props,
        });
    }

    protected contract<T>(value: object): T {
        return value as T;
    }
}
