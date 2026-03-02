import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { StatsService } from "./stats.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { Permission } from "@prisma/client";

@Controller("stats")
@UseGuards(AuthGuard, AccessGuard)
export class StatsController {
  constructor(private service: StatsService) {}

  @Get("overview")
  @Roles("ADMIN", "PRODUCTION", "SALES")
  @Permissions(Permission.REPORTS_READ)
  overview(@Query("from") from?: string, @Query("to") to?: string) {
    return this.service.overview({ from, to });
  }
}
