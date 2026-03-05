import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExpenseItemsService } from './expense-items.service';
import { CreateExpenseItemDto } from './dto/create-expense-item.dto';
import { UpdateExpenseItemDto } from './dto/update-expense-item.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';

@Controller('expense-items')
@UseGuards(AuthGuard, AccessGuard)
@Roles('ADMIN')
export class ExpenseItemsController {
  constructor(private service: ExpenseItemsService) {}

  @Get()
  @Permissions(Permission.EXPENSES_READ)
  list(@Query('categoryId') categoryId?: string) {
    return this.service.list(categoryId);
  }

  @Post()
  @Permissions(Permission.EXPENSES_WRITE)
  create(@Body() dto: CreateExpenseItemDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions(Permission.EXPENSES_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateExpenseItemDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.EXPENSES_WRITE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
