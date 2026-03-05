import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CustomerGuard } from '../auth/guards/customer.guard';
import { Request } from '@nestjs/common';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('validate')
  @UseGuards(CustomerGuard)
  validate(
    @Query('code') code: string,
    @Query('total') total: string,
    @Request() req,
  ) {
    return this.couponsService.validate(code, req.user.id, parseInt(total));
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.couponsService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: any) {
    return this.couponsService.create(dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
