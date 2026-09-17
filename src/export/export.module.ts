import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { CustomersModule } from '../customers/customers.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [
    ProductsModule,
    SalesModule,
    PurchasesModule,
    CustomersModule,
    SuppliersModule,
    ExpensesModule,
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
