import { ReauthenticationConsumer } from "./reauthentication.consumer";
import { AccessCacheConsumer } from "./access-cache.consumer";
import { BlacklistConsumer } from "./blacklist.consumer";
import { PositionConsumer } from "./position.consumer";

export const CONSUMERS = [PositionConsumer, ReauthenticationConsumer, BlacklistConsumer, AccessCacheConsumer];

export { PositionConsumer, ReauthenticationConsumer, BlacklistConsumer, AccessCacheConsumer };
