import { APP_FILTER } from "@nestjs/core";
import { Module } from "@nestjs/common";

import { ExceptionFilter } from "~common/exceptions";
import { InfrastructureModule } from "~infrastructure";
import { TemplateModule } from "~context/template.module";
import { ObservabilityModule } from "~observability";
import { SystemModule } from "~common/system.module";

@Module({
    imports: [SystemModule, InfrastructureModule, ObservabilityModule, TemplateModule],
    providers: [
        {
            provide: APP_FILTER,
            useClass: ExceptionFilter,
        },
    ],
})
export class MainModule {}
