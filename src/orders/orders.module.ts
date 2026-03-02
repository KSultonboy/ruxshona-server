import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { PublicOrdersController } from "./public-orders.controller";
import { CouponsService } from "./coupons.service";
import { CouponsController } from "./coupons.controller";
import { RetentionService } from "./retention.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [OrdersController, PublicOrdersController, CouponsController],
  providers: [OrdersService, CouponsService, RetentionService],
  exports: [OrdersService, CouponsService],
})
export class OrdersModule { }
