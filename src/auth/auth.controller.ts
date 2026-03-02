import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { AuthGuard } from "./guards/auth.guard";
import type { Request } from "express";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get("me")
  me(@Req() req: Request) {
    const user = (req as any).user;
    return this.auth.me(user.sub);
  }

  @UseGuards(AuthGuard)
  @Get("permissions")
  permissions(@Req() req: Request) {
    const user = (req as any).user;
    return this.auth.permissions(user.sub);
  }
}
