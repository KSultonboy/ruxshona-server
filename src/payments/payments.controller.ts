import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentSourceType, Permission } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
@UseGuards(AuthGuard, AccessGuard)
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Get()
  @Roles('ADMIN')
  @Permissions(Permission.PAYMENTS_READ)
  list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sourceType') sourceType?: PaymentSourceType,
    @Query('branchId') branchId?: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.list({ from, to, sourceType, branchId, shopId });
  }

  @Post()
  @Roles('ADMIN')
  @Permissions(Permission.PAYMENTS_WRITE)
  create(@Body() dto: CreatePaymentDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.create(dto, user.sub);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions(Permission.PAYMENTS_WRITE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
