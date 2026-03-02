import { Body, Controller, Get, Param, Query, Put, UseGuards } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionsService } from "./permissions.service";
import { ReplacePermissionsDto } from "./dto/replace-permissions.dto";

@Controller("permissions")
@UseGuards(AuthGuard, AccessGuard)
export class PermissionsController {
  constructor(private service: PermissionsService) {}

  @Get("definitions")
  @Permissions(Permission.USERS_READ)
  definitions() {
    return this.service.definitions();
  }

  @Get()
  @Permissions(Permission.USERS_READ)
  list(@Query("userId") userId?: string) {
    if (userId) {
      return this.service.listByUser(userId);
    }
    return this.service.listAll();
  }

  @Put(":userId")
  @Permissions(Permission.USERS_WRITE)
  replace(@Param("userId") userId: string, @Body() dto: ReplacePermissionsDto) {
    return this.service.replaceForUser(userId, dto.permissions ?? []);
  }
}
