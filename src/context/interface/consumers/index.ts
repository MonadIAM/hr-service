import { ReauthenticationConsumer } from "./reauthentication.consumer";
import { AccessCacheConsumer } from "./access-cache.consumer";
import { BlacklistConsumer } from "./blacklist.consumer";

export const CONSUMERS = [ReauthenticationConsumer, BlacklistConsumer, AccessCacheConsumer];

export { ReauthenticationConsumer, BlacklistConsumer, AccessCacheConsumer };
