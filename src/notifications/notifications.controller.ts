import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";
import { PushTestDto } from "./dto/push-test.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { User } from "../auth/decorators/user.decorator";

@Controller("notifications")
@UseGuards(AuthGuard, AccessGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) { }

  @Post("push-token")
  register(@User() user: { id?: string; sub?: string }, @Body() dto: RegisterPushTokenDto) {
    const userId = user?.id ?? user?.sub ?? "";
    if (!userId) throw new BadRequestException("Missing user");
    return this.service.register(userId, dto);
  }

  @Post("push-test")
  test(@User() user: { id?: string; sub?: string }, @Body() dto: PushTestDto) {
    const userId = user?.id ?? user?.sub ?? "";
    if (!userId) throw new BadRequestException("Missing user");
    return this.service.sendTest(userId, dto.title ?? "", dto.body ?? "");
  }
}
