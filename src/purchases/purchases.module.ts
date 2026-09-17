import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Purchase, PurchaseSchema } from './schemas/purchase.schema';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { ProductsModule } from '../products/products.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Purchase.name, schema: PurchaseSchema }]),
    ProductsModule,
    SuppliersModule,
    InventoryModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService, MongooseModule],
})
export class PurchasesModule {}
