import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';

@Controller('warehouse')
@UseGuards(AuthGuard, AccessGuard)
export class WarehouseController {
  constructor(private service: WarehouseService) {}

  @Get('summary')
  @Roles('ADMIN', 'PRODUCTION')
  @Permissions(Permission.WAREHOUSE_READ)
  summary() {
    return this.service.summary();
  }

  @Get('movements')
  @Roles('ADMIN', 'PRODUCTION')
  @Permissions(Permission.WAREHOUSE_READ)
  list(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    return this.service.list(Number.isFinite(parsed) ? parsed : undefined);
  }

  @Post('movements')
  @Roles('PRODUCTION')
  @Permissions(Permission.WAREHOUSE_WRITE)
  create(@Body() dto: CreateStockMovementDto) {
    return this.service.createMovement(dto);
  }
}
