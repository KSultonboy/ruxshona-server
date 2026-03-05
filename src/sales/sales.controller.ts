import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard, type AuthUser } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { User } from '../auth/decorators/user.decorator';
import type { Express } from 'express';
import { diskStorage } from 'multer';
import { FilesInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import { RemoveShiftPhotoDto } from './dto/remove-shift-photo.dto';

@Controller('sales')
@UseGuards(AuthGuard, AccessGuard)
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Get('branch-stock')
  @Roles('ADMIN', 'SALES', 'PRODUCTION')
  @Permissions(Permission.SALES_READ)
  branchStock(@User() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.service.branchStock(user, branchId);
  }

  @Get()
  @Roles('ADMIN', 'SALES', 'PRODUCTION')
  @Permissions(Permission.SALES_READ)
  list(
    @User() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list(user, { branchId, from, to });
  }

  @Get('barcode/:barcode')
  @Roles('ADMIN', 'SALES', 'PRODUCTION')
  @Permissions(Permission.SALES_READ)
  productByBarcode(
    @User() user: AuthUser,
    @Param('barcode') barcode: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.findByBarcode(user, barcode, branchId);
  }

  @Post('sell')
  @Roles('ADMIN', 'SALES')
  @Permissions(Permission.SALES_WRITE)
  sell(@Body() dto: CreateSaleDto, @User() user: AuthUser) {
    return this.service.sell(dto, user);
  }

  @Get('shift')
  @Roles('SALES')
  @Permissions(Permission.SALES_WRITE)
  getShift(@User() user: AuthUser) {
    return this.service.getOpenShift(user);
  }

  @Post('shift/open')
  @Roles('SALES')
  @Permissions(Permission.SALES_WRITE)
  openShift(@User() user: AuthUser) {
    return this.service.openShift(user);
  }

  @Post('shift/close')
  @Roles('SALES')
  @Permissions(Permission.SALES_WRITE)
  closeShift(@User() user: AuthUser) {
    return this.service.closeShift(user);
  }

  @Post('shift/photos')
  @Roles('SALES')
  @Permissions(Permission.SALES_WRITE)
  @UseInterceptors(
    FilesInterceptor('images', 6, {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'shifts'),
        filename: (_req, file, cb) => {
          const stamp = Date.now();
          const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '');
          cb(null, `${stamp}-${Math.round(Math.random() * 1e6)}-${safe}`);
        },
      }),
    }),
  )
  uploadShiftPhotos(
    @User() user: AuthUser,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.addShiftPhotos(user, files);
  }

  @Get('shift/photos')
  @Roles('ADMIN')
  @Permissions(Permission.SALES_READ)
  listUploadedShiftPhotos(@User() user: AuthUser) {
    return this.service.listUploadedShiftPhotos(user);
  }

  @Delete('shift/photos/:shiftId')
  @Roles('ADMIN')
  @Permissions(Permission.SALES_WRITE)
  deleteShiftPhoto(
    @User() user: AuthUser,
    @Param('shiftId') shiftId: string,
    @Body() dto: RemoveShiftPhotoDto,
  ) {
    return this.service.deleteShiftPhoto(user, shiftId, dto.photo);
  }
}
