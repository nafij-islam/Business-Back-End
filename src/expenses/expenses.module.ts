import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from './schemas/expense.schema';
import { ExpenseCategory, ExpenseCategorySchema } from './schemas/expense-category.schema';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: ExpenseCategory.name, schema: ExpenseCategorySchema },
    ]),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService, MongooseModule],
})
export class ExpensesModule {}
