import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { AccessGuard } from '../auth/guards/access.guard';
import { AuthGuard, type AuthUser } from '../auth/guards/auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TelegramCashbackService } from './telegram-cashback.service';
import { SyncTelegramCashbackUserDto } from './dto/sync-telegram-cashback-user.dto';
import { AwardCashbackDto } from './dto/award-cashback.dto';
import { UpdateTelegramMembershipDto } from './dto/update-membership.dto';
import { SettleCashbackDto } from './dto/settle-cashback.dto';

@Controller('telegram-cashback')
export class TelegramCashbackController {
  constructor(private readonly service: TelegramCashbackService) {}

  @Post('bot/users/sync')
  syncBotUser(
    @Headers('x-bot-key') botKey: string | undefined,
    @Body() dto: SyncTelegramCashbackUserDto,
  ) {
    this.assertBotKey(botKey);
    return this.service.syncBotUser(dto);
  }

  @Get('bot/users/:telegramId')
  getBotProfile(
    @Headers('x-bot-key') botKey: string | undefined,
    @Param('telegramId') telegramId: string,
  ) {
    this.assertBotKey(botKey);
    return this.service.getBotProfile(telegramId);
  }

  @Post('bot/users/:telegramId/membership')
  updateMembership(
    @Headers('x-bot-key') botKey: string | undefined,
    @Param('telegramId') telegramId: string,
    @Body() dto: UpdateTelegramMembershipDto,
  ) {
    this.assertBotKey(botKey);
    return this.service.updateMembership(telegramId, dto);
  }

  @Get('lookup/:barcode')
  @UseGuards(AuthGuard, AccessGuard)
  @Roles('ADMIN', 'SALES')
  @Permissions(Permission.SALES_READ)
  lookupBarcode(@Param('barcode') barcode: string) {
    return this.service.lookupByBarcode(barcode);
  }

  @Post('award')
  @UseGuards(AuthGuard, AccessGuard)
  @Roles('ADMIN', 'SALES')
  @Permissions(Permission.SALES_WRITE)
  awardCashback(@Body() dto: AwardCashbackDto, @User() user: AuthUser) {
    return this.service.awardCashback(dto, user);
  }

  @Post('settle')
  @UseGuards(AuthGuard, AccessGuard)
  @Roles('ADMIN', 'SALES')
  @Permissions(Permission.SALES_WRITE)
  settleCashback(@Body() dto: SettleCashbackDto, @User() user: AuthUser) {
    return this.service.settleCashback(dto, user);
  }

  private assertBotKey(botKey: string | undefined) {
    const configured = process.env.TELEGRAM_BOT_API_KEY?.trim();
    if (!configured || botKey?.trim() !== configured) {
      throw new UnauthorizedException('Invalid bot key');
    }
  }
}
