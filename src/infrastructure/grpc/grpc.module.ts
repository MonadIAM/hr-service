import { ClientsModule, Transport } from "@nestjs/microservices";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AccessControlClient } from "./access-control.client";
import { GRPC_CONFIG } from "./tokens";

const ACCESS_CONTROL_PROTO_PATH = require.resolve("@monadiam/shared/grpc/access_control.proto");

@Global()
@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: GRPC_CONFIG,
                inject: [ConfigService],
                useFactory: (config: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        url: config.getOrThrow<string>("ACCESS_CONTROL_GRPC_URL"),
                        package: "monadiam.grpc.access_control.v1",
                        protoPath: ACCESS_CONTROL_PROTO_PATH,
                        loader: { enums: String },
                    },
                }),
            },
        ]),
    ],
    providers: [AccessControlClient],
    exports: [AccessControlClient],
})
export class GRPCModule {}
