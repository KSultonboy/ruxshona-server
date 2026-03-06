import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';

@Controller('transfers')
@UseGuards(AuthGuard, AccessGuard)
export class TransfersController {
  constructor(private service: TransfersService) {}

  @Get()
  @Roles('ADMIN', 'PRODUCTION', 'SALES')
  @Permissions(Permission.TRANSFERS_READ)
  list(@Req() req: Request) {
    const user = (req as any).user;
    return this.service.list({ id: user.sub, role: user.role });
  }

  @Post()
  @Roles('ADMIN', 'PRODUCTION')
  @Permissions(Permission.TRANSFERS_WRITE)
  create(@Body() dto: CreateTransferDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.create(dto, { id: user.sub, role: user.role });
  }

  @Patch(':id')
  @Roles('ADMIN', 'PRODUCTION')
  @Permissions(Permission.TRANSFERS_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTransferDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.service.update(id, dto, { id: user.sub, role: user.role });
  }

  @Delete(':id')
  @Roles('ADMIN', 'PRODUCTION')
  @Permissions(Permission.TRANSFERS_WRITE)
  remove(
    @Param('id') id: string,
    @Query('specialCode') specialCode: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.service.remove(id, { id: user.sub, role: user.role }, specialCode);
  }

  @Post(':id/receive')
  @Roles('ADMIN', 'SALES')
  @Permissions(Permission.TRANSFERS_RECEIVE)
  receive(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.receive(id, { id: user.sub, role: user.role });
  }
}
