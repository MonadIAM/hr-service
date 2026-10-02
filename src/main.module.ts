import { APP_FILTER } from "@nestjs/core";
import { Module } from "@nestjs/common";

import { ExceptionFilter } from "~common/exceptions";
import { InfrastructureModule } from "~infrastructure";
import { ObservabilityModule } from "~observability";
import { SystemModule } from "~common/system.module";
import { HrModule } from "~context/hr.module";

@Module({
    imports: [SystemModule, InfrastructureModule, ObservabilityModule, HrModule],
    providers: [
        {
            provide: APP_FILTER,
            useClass: ExceptionFilter,
        },
    ],
})
export class MainModule {}
