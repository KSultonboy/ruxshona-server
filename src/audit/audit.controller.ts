import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permission } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(AuthGuard, AccessGuard)
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @Permissions(Permission.AUDIT_READ)
  list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.audit.list({
      from,
      to,
      entity,
      userId,
      action,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 50,
    });
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.audit.remove(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() body: any) {
    return this.audit.update(id, body);
  }
}
