import { ReauthenticationConsumer } from "./reauthentication.consumer";
import { AccessCacheConsumer } from "./access-cache.consumer";
import { BlacklistConsumer } from "./blacklist.consumer";
import { PositionConsumer } from "./position.consumer";
import { RealmConsumer } from "./realm.consumer";

export const CONSUMERS = [
    ReauthenticationConsumer,
    AccessCacheConsumer,
    BlacklistConsumer,
    PositionConsumer,
    RealmConsumer,
];

export { ReauthenticationConsumer, AccessCacheConsumer, BlacklistConsumer, PositionConsumer, RealmConsumer };
