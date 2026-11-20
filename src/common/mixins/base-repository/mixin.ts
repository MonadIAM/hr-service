import { QueryOrder } from "@mikro-orm/postgresql";

import { ExceptionMapper } from "~common/exceptions";

export function BaseRepository<
    E extends ORM.AnyEntity,
    A extends Repositories.Mappers.Meta,
    C extends Class<Repositories.Mappers.Contract<E, A>> = Class<Repositories.Mappers.Contract<E, A>>,
>({ Entity, Mapper }: Repositories.Base.Mixin.Props<E, A, C>): Repositories.Base.Mixin.Result<E, A, C> {
    return class Mixin extends Mapper implements Repositories.Base.Contract<E, A> {
        declare protected readonly readManager: ORM.EntityManager;

        public readonly resource = Entity.name;

        public constructor(...args: AnyArray) {
            super(...args);
        }

        public async findUnique<P extends string = never, F extends string = "*">({
            transaction,
            options,
            where,
        }: Repositories.Base.FindUnique<E, P, F>): Promise<Nullable<ORM.Loaded<E, P, F>>> {
            try {
                const entityManager = transaction ?? this.readManager.fork();
                if (options?.lockMode) {
                    const lockOptions = this.buildLockOptions(entityManager, options);
                    if (!this.requiresPopulation(entityManager, options)) {
                        return await entityManager.findOne(Entity, where, {
                            ...options,
                            lockTableAliases: lockOptions.lockTableAliases,
                        });
                    }
                    const entity = await entityManager.findOne(Entity, where, {
                        ...lockOptions,
                        orderBy: options.orderBy,
                    });
                    if (!entity) {
                        return null;
                    }
                    return await entityManager.findOne(Entity, entity, {
                        ...options,
                        lockMode: undefined,
                    });
                } else {
                    return await entityManager.findOne(Entity, where, options);
                }
            } catch (error) {
                throw ExceptionMapper.fromORM(error, this.resource);
            }
        }

        public async findUniqueOrThrow<P extends string = never, F extends string = "*">({
            transaction,
            options,
            where,
        }: Repositories.Base.FindUniqueOrThrow<E, P, F>): Promise<ORM.Loaded<E, P, F>> {
            try {
                const entityManager = transaction ?? this.readManager.fork();
                if (options?.lockMode) {
                    const lockOptions = this.buildLockOptions(entityManager, options);
                    if (!this.requiresPopulation(entityManager, options)) {
                        return await entityManager.findOneOrFail(Entity, where, {
                            ...options,
                            lockTableAliases: lockOptions.lockTableAliases,
                        });
                    }
                    const entity = await entityManager.findOneOrFail(Entity, where, {
                        ...lockOptions,
                        orderBy: options.orderBy,
                    });
                    return await entityManager.findOneOrFail(Entity, entity, {
                        ...options,
                        lockMode: undefined,
                    });
                } else {
                    return await entityManager.findOneOrFail(Entity, where, options);
                }
            } catch (error) {
                throw ExceptionMapper.fromORM(error, this.resource);
            }
        }

        public async find<P extends string = never, F extends string = "*">({
            transaction,
            options,
            where,
        }: Repositories.Base.Find<E, P, F>): Promise<ORM.Loaded<E, P, F>[]> {
            try {
                const entityManager = transaction ?? this.readManager.fork();
                if (options?.lockMode) {
                    const lockOptions = this.buildLockOptions(entityManager, options);
                    if (!this.requiresPopulation(entityManager, options)) {
                        return await entityManager.find(Entity, where, {
                            ...options,
                            lockTableAliases: lockOptions.lockTableAliases,
                        });
                    }
                    const entities = await entityManager.find(Entity, where, lockOptions);
                    return await entityManager.find(Entity, entities, {
                        ...options,
                        offset: undefined,
                        limit: undefined,
                        lockMode: undefined,
                    });
                } else {
                    return await entityManager.find(Entity, where, options);
                }
            } catch (error) {
                throw ExceptionMapper.fromORM(error, this.resource);
            }
        }

        public async findMany<P extends string = never, F extends string = "*">(
            props: Repositories.Base.FindMany<E, A, P, F>,
        ): Promise<[ORM.Loaded<E, P, F>[], number]> {
            try {
                if ("where" in props) {
                    const { transaction, options, where } = props;
                    const entityManager = transaction ?? this.readManager.fork();
                    if (options?.lockMode) {
                        const lockOptions = this.buildLockOptions(entityManager, options);
                        if (!this.requiresPopulation(entityManager, options)) {
                            return await entityManager.findAndCount(Entity, where, {
                                ...options,
                                lockTableAliases: lockOptions.lockTableAliases,
                            });
                        }
                        const entities = await entityManager.find(Entity, where, lockOptions);
                        const total = await entityManager.count(Entity, where, options);
                        const loaded = await entityManager.find(Entity, entities, {
                            ...options,
                            lockMode: undefined,
                            offset: undefined,
                            limit: undefined,
                        });
                        return [loaded, total];
                    } else {
                        return await entityManager.findAndCount(Entity, where, options);
                    }
                } else {
                    const { pagination, filters, sort, options, prefilter } = props;
                    const opts = super.buildOptionsORM<P, F>(sort, pagination, options);
                    const where = super.buildWhereORM(filters, prefilter);
                    const entityManager = this.readManager.fork();
                    return await entityManager.findAndCount(Entity, where, opts);
                }
            } catch (error) {
                throw ExceptionMapper.fromORM(error, this.resource);
            }
        }

        private requiresPopulation<P extends string, F extends string>(
            entityManager: ORM.EntityManager,
            options: ORM.FindOptions<E, P, F>,
        ): boolean {
            return (
                options.populate !== false &&
                (Boolean(options.populate?.length) ||
                    Boolean(options.fields?.some((field) => field.includes("."))) ||
                    entityManager.getMetadata(Entity).props.some((property) => property.eager))
            );
        }

        private buildLockOptions<P extends string, F extends string>(
            entityManager: ORM.EntityManager,
            options: ORM.FindOptions<E, P, F>,
        ): ORM.FindOptions<E, P, F> {
            const orderBy: ORM.QueryOrderMap<E> = {};
            for (const key of entityManager.getMetadata(Entity).primaryKeys) {
                Object.assign(orderBy, { [key]: QueryOrder.ASC });
            }
            return {
                ...options,
                orderBy: options.limit || options.offset ? options.orderBy : orderBy,
                lockTableAliases: [entityManager.createQueryBuilder(Entity).alias],
                populate: false,
            };
        }
    };
}
