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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';

@Controller('expenses')
@UseGuards(AuthGuard, AccessGuard)
@Roles('ADMIN')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  @Permissions(Permission.EXPENSES_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @Permissions(Permission.EXPENSES_WRITE)
  create(@Body() dto: CreateExpenseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions(Permission.EXPENSES_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.EXPENSES_WRITE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
