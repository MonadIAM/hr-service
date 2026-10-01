import { SetMetadata } from "@nestjs/common";

import { REAUTHENTICATION } from "./tokens";

/** @public */
export function Reauthentication(): MethodDecorator {
    return SetMetadata(REAUTHENTICATION, true);
}
