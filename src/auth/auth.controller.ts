import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthGuard } from './guards/auth.guard';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    const username = dto.username?.trim() || dto.login?.trim();
    if (!username || !dto.password?.trim()) {
      throw new BadRequestException('login and password required');
    }
    return this.auth.login(username, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    const refreshToken =
      dto.refreshToken?.trim() || dto.refresh?.trim() || dto.token?.trim();
    if (!refreshToken) {
      throw new BadRequestException('refresh token required');
    }
    return this.auth.refresh(refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    const refreshToken =
      dto.refreshToken?.trim() || dto.refresh?.trim() || dto.token?.trim();
    if (!refreshToken) {
      throw new BadRequestException('refresh token required');
    }
    return this.auth.logout(refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    const user = (req as any).user;
    return this.auth.me(user.sub);
  }

  @UseGuards(AuthGuard)
  @Get('permissions')
  permissions(@Req() req: Request) {
    const user = (req as any).user;
    return this.auth.permissions(user.sub);
  }
}
