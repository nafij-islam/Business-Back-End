import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SalesModule } from '../sales/sales.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    SalesModule,
    PurchasesModule,
    ExpensesModule,
    InventoryModule,
    ProductsModule,
    CategoriesModule,
    SuppliersModule,
    CustomersModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
