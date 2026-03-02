import { Module } from "@nestjs/common";
import { WagesController } from "./wages.controller";
import { WagesService } from "./wages.service";

import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
    imports: [AuthModule, PrismaModule],
    controllers: [WagesController],
    providers: [WagesService],
})
export class WagesModule { }
