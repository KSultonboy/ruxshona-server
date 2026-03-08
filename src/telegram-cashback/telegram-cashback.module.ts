import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramCashbackController } from './telegram-cashback.controller';
import { TelegramCashbackService } from './telegram-cashback.service';

@Module({
  imports: [AuthModule],
  controllers: [TelegramCashbackController],
  providers: [TelegramCashbackService, PrismaService],
  exports: [TelegramCashbackService],
})
export class TelegramCashbackModule {}
