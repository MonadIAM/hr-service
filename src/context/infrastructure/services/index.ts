import { ClassProvider } from "@nestjs/common";

import { REAUTHENTICATION_CACHE_SERVICE, BLACKLIST_CACHE_SERVICE, ACCESS_CACHE_SERVICE } from "./tokens";
import { ReauthenticationCacheService } from "./reauthentication-cache.service";
import { BlacklistCacheService } from "./blacklist-cache.service";
import { AccessCacheService } from "./access-cache.service";

export const INFRASTRUCTURE_SERVICES: ClassProvider[] = [
    {
        provide: REAUTHENTICATION_CACHE_SERVICE,
        useClass: ReauthenticationCacheService,
    },
    {
        provide: BLACKLIST_CACHE_SERVICE,
        useClass: BlacklistCacheService,
    },
    {
        provide: ACCESS_CACHE_SERVICE,
        useClass: AccessCacheService,
    },
];

export { REAUTHENTICATION_CACHE_SERVICE, BLACKLIST_CACHE_SERVICE, ACCESS_CACHE_SERVICE };
