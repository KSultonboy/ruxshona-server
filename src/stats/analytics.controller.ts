import { Controller, Get, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { Permission } from "@prisma/client";

@Controller("analytics")
@UseGuards(AuthGuard, AccessGuard)
export class AnalyticsController {
    constructor(private readonly service: AnalyticsService) { }

    @Get("marketing")
    @Permissions(Permission.REPORTS_READ)
    getMarketingStats() {
        return this.service.getMarketingStats();
    }
}
