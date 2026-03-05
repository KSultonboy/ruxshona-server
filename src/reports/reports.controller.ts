import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Permission } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard, AccessGuard)
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('overview')
  @Permissions(Permission.REPORTS_READ)
  overview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.overview({ from, to });
  }

  @Get('timeseries')
  @Permissions(Permission.REPORTS_READ)
  timeseries(@Query() query: Record<string, string>) {
    const metric = query.metric ?? 'revenue';
    const granularity = query.granularity ?? 'week';
    return this.service.timeseries({
      metric: metric as any,
      granularity: granularity as any,
      from: query.from,
      to: query.to,
      branchId: query.branchId,
      shopId: query.shopId,
      productId: query.productId,
      categoryId: query.categoryId,
      paymentMethod: query.paymentMethod,
      sourceType: query.sourceType,
    });
  }

  @Get('segments')
  @Permissions(Permission.REPORTS_READ)
  segments(@Query() query: Record<string, string>) {
    const metric = query.metric ?? 'revenue';
    const segmentBy = query.segmentBy ?? 'branch';
    return this.service.segments({
      metric: metric as any,
      segmentBy: segmentBy as any,
      from: query.from,
      to: query.to,
      branchId: query.branchId,
      shopId: query.shopId,
      productId: query.productId,
      categoryId: query.categoryId,
      paymentMethod: query.paymentMethod,
      sourceType: query.sourceType,
    });
  }

  @Get('data/:type')
  @Permissions(Permission.REPORTS_READ)
  exportData(
    @Param('type') type: string,
    @Query() query: Record<string, string>,
  ) {
    return this.service.exportData(type, {
      from: query.from,
      to: query.to,
      branchId: query.branchId,
      shopId: query.shopId,
      productId: query.productId,
      categoryId: query.categoryId,
      paymentMethod: query.paymentMethod,
      sourceType: query.sourceType,
    });
  }

  @Get('csv/:type')
  @Permissions(Permission.REPORTS_READ)
  async exportCsv(
    @Param('type') type: string,
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(type, {
      from: query.from,
      to: query.to,
      branchId: query.branchId,
      shopId: query.shopId,
      productId: query.productId,
      categoryId: query.categoryId,
      paymentMethod: query.paymentMethod,
      sourceType: query.sourceType,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${type}-report.csv`,
    );
    res.send(csv);
  }
}
