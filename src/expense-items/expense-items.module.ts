import { Module } from '@nestjs/common';
import { ExpenseItemsService } from './expense-items.service';
import { ExpenseItemsController } from './expense-items.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ExpenseItemsController],
  providers: [ExpenseItemsService],
})
export class ExpenseItemsModule {}
