import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sale, SaleSchema } from './schemas/sale.schema';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sale.name, schema: SaleSchema }]),
    ProductsModule,
    CustomersModule,
    InventoryModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService, MongooseModule],
})
export class SalesModule {}
