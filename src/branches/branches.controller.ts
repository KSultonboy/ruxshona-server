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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';

@Controller('branches')
@UseGuards(AuthGuard, AccessGuard)
export class BranchesController {
  constructor(private service: BranchesService) {}

  @Get()
  @Roles('ADMIN', 'SALES', 'PRODUCTION')
  @Permissions(Permission.BRANCHES_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @Roles('ADMIN')
  @Permissions(Permission.BRANCHES_WRITE)
  create(@Body() dto: CreateBranchDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @Permissions(Permission.BRANCHES_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions(Permission.BRANCHES_WRITE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
