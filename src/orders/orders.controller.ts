import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { OrderStatus } from "@prisma/client";
import { OrdersService } from "./orders.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

@Controller("orders")
@UseGuards(AuthGuard, AccessGuard)
@Roles("ADMIN")
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Get()
  list(@Query("status") status?: OrderStatus) {
    return this.service.list(status);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const user = (req as any).user;
    const userId = user?.sub ?? user?.id;
    return this.service.create(dto, userId);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }
}
