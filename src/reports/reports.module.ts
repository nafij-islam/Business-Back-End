import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SalesModule } from '../sales/sales.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [
    SalesModule,
    PurchasesModule,
    ExpensesModule,
    InventoryModule,
    ProductsModule,
    CustomersModule,
    SuppliersModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
