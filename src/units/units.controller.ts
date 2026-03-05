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
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';

@Controller('units')
@UseGuards(AuthGuard, AccessGuard)
@Roles('ADMIN')
export class UnitsController {
  constructor(private service: UnitsService) {}

  @Get()
  @Permissions(Permission.PRODUCTS_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @Permissions(Permission.PRODUCTS_WRITE)
  create(@Body() dto: CreateUnitDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions(Permission.PRODUCTS_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.PRODUCTS_WRITE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
