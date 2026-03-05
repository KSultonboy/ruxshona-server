import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [StatsService, AnalyticsService],
  controllers: [StatsController, AnalyticsController],
})
export class StatsModule {}
