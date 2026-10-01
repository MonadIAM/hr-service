import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import ms, { StringValue } from "ms";
import Redis from "ioredis";

import { REDIS_CACHE_CLIENT } from "~infrastructure/redis";
import { AccessControlClient } from "~infrastructure/grpc";

@Injectable()
export class AccessCacheService implements InfrastructureServices.AccessCache.Contract {
    private readonly ttl: number;
    private readonly namespace = "access-cache";

    public constructor(
        @Inject(REDIS_CACHE_CLIENT)
        private readonly redis: Redis,
        private readonly configService: ConfigService,
        private readonly accessControlClient: AccessControlClient,
    ) {
        this.ttl = ms(this.configService.getOrThrow<StringValue>("ACCESS_CACHE_TTL")) / 1e3;
    }

    public async checkPermissions(
        props: InfrastructureServices.AccessCache.CheckPermissions.Props,
    ): InfrastructureServices.AccessCache.CheckPermissions.Result {
        const { account, realm, permissions, globalOnly } = props;
        const key = await this.resolveVersionedKey({ account, realm });
        const loadedKey = `${key}:loaded`;
        const pipeline = this.redis.pipeline();

        pipeline.exists(loadedKey);

        for (const permission of permissions) {
            if (globalOnly) {
                pipeline.hget(key, permission);
            } else {
                pipeline.hexists(key, permission);
            }
        }

        pipeline.expire(key, this.ttl);
        pipeline.expire(loadedKey, this.ttl);

        const results = await pipeline.exec();
        const isLoaded = results?.[0]?.[1] === 1;

        if (isLoaded) {
            const checks = results?.slice(1, 1 + permissions.length) ?? [];

            return permissions.filter((_, i) => (globalOnly ? checks[i]?.[1] === "GLOBAL" : checks[i]?.[1] === 1));
        }

        const effectivePermissions = await this.accessControlClient.listEffectivePrivileges({ account, realm });
        const cachePipeline = this.redis.pipeline();

        if (Object.keys(effectivePermissions).length) {
            cachePipeline.hset(key, effectivePermissions);
            cachePipeline.expire(key, this.ttl);
        }

        cachePipeline.set(loadedKey, "1", "EX", this.ttl);

        await cachePipeline.exec();

        return permissions.filter((permission) =>
            globalOnly ? effectivePermissions[permission] === "GLOBAL" : Boolean(effectivePermissions[permission]),
        );
    }

    public async delete(
        props: InfrastructureServices.AccessCache.Delete.Props,
    ): InfrastructureServices.AccessCache.Delete.Result {
        const { account, realm } = props;
        const key = await this.resolveVersionedKey({ account, realm });

        await this.redis.unlink(key, `${key}:loaded`);
    }

    public async deleteAccount(
        props: InfrastructureServices.AccessCache.DeleteAccount.Props,
    ): InfrastructureServices.AccessCache.DeleteAccount.Result {
        const { account } = props;
        await this.redis.incr(`${this.namespace}:account-version:${account}`);
    }

    public async deleteRealm(
        props: InfrastructureServices.AccessCache.DeleteRealm.Props,
    ): InfrastructureServices.AccessCache.DeleteRealm.Result {
        const { realm } = props;
        await this.redis.incr(`${this.namespace}:realm-version:${realm}`);
    }

    public async deleteAll(): InfrastructureServices.AccessCache.DeleteAll.Result {
        await this.redis.incr(`${this.namespace}:global-version`);
    }

    public async resolveVersionedKey(
        props: InfrastructureServices.AccessCache.ResolveVersionedKey.Props,
    ): InfrastructureServices.AccessCache.ResolveVersionedKey.Result {
        const { account, realm } = props;
        const globalVersionKey = `${this.namespace}:global-version`;
        const accountVersionKey = `${this.namespace}:account-version:${account}`;
        const realmVersionKey = `${this.namespace}:realm-version:${realm}`;

        const versions = await this.redis.mget(globalVersionKey, accountVersionKey, realmVersionKey);
        const [globalVersion, accountVersion, realmVersion] = versions.map((version) => version ?? "0");

        return `${this.namespace}:${globalVersion}:${account}:${accountVersion}:${realm}:${realmVersion}`;
    }
}
