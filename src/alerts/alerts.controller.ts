import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { AlertsService } from "./alerts.service";
import { CreateAlertRuleDto } from "./dto/create-alert-rule.dto";
import { UpdateAlertRuleDto } from "./dto/update-alert-rule.dto";

@Controller("alerts")
@UseGuards(AuthGuard, AccessGuard)
export class AlertsController {
  constructor(private service: AlertsService) {}

  @Get()
  @Permissions(Permission.ALERTS_READ)
  listAlerts() {
    return this.service.listAlerts();
  }

  @Get("rules")
  @Permissions(Permission.ALERTS_READ)
  listRules() {
    return this.service.listRules();
  }

  @Post("rules")
  @Permissions(Permission.ALERTS_WRITE)
  createRule(@Body() dto: CreateAlertRuleDto) {
    return this.service.createRule(dto);
  }

  @Patch("rules/:id")
  @Permissions(Permission.ALERTS_WRITE)
  updateRule(@Param("id") id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.service.updateRule(id, dto);
  }

  @Delete("rules/:id")
  @Permissions(Permission.ALERTS_WRITE)
  removeRule(@Param("id") id: string) {
    return this.service.removeRule(id);
  }
}
