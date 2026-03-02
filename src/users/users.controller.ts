import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { Permission } from "@prisma/client";

@Controller("users")
@UseGuards(AuthGuard, AccessGuard)
@Roles("ADMIN")
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @Permissions(Permission.USERS_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @Permissions(Permission.USERS_WRITE)
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @Permissions(Permission.USERS_WRITE)
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.USERS_WRITE)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
