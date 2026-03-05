import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';

@Controller('shops')
@UseGuards(AuthGuard, AccessGuard)
export class ShopsController {
  constructor(private service: ShopsService) {}

  @Get()
  @Roles('ADMIN', 'SALES', 'PRODUCTION')
  @Permissions(Permission.SHOPS_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @Roles('ADMIN')
  @Permissions(Permission.SHOPS_WRITE)
  create(@Body() dto: CreateShopDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @Permissions(Permission.SHOPS_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateShopDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions(Permission.SHOPS_WRITE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
