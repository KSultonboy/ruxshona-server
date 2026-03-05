import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnDto } from './dto/update-return.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';

@Controller('returns')
@UseGuards(AuthGuard, AccessGuard)
export class ReturnsController {
  constructor(private service: ReturnsService) {}

  @Get()
  @Roles('ADMIN', 'PRODUCTION', 'SALES')
  @Permissions(Permission.RETURNS_READ)
  list(@Req() req: Request) {
    const user = (req as any).user;
    return this.service.list({ id: user.sub, role: user.role });
  }

  @Post()
  @Roles('ADMIN', 'SALES')
  @Permissions(Permission.RETURNS_WRITE)
  create(@Body() dto: CreateReturnDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.create(dto, { id: user.sub, role: user.role });
  }

  @Patch(':id')
  @Roles('ADMIN', 'SALES')
  @Permissions(Permission.RETURNS_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReturnDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.service.update(id, dto, { id: user.sub, role: user.role });
  }

  @Delete(':id')
  @Roles('ADMIN', 'SALES')
  @Permissions(Permission.RETURNS_WRITE)
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.remove(id, { id: user.sub, role: user.role });
  }

  @Post(':id/approve')
  @Roles('ADMIN')
  @Permissions(Permission.RETURNS_APPROVE)
  approve(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.approve(id, { id: user.sub, role: user.role });
  }

  @Post(':id/reject')
  @Roles('ADMIN')
  @Permissions(Permission.RETURNS_APPROVE)
  reject(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.reject(id, { id: user.sub, role: user.role });
  }
}
