import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseItemDto } from './create-expense-item.dto';

export class UpdateExpenseItemDto extends PartialType(CreateExpenseItemDto) {}
