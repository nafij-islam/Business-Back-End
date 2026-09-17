import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StockTransaction, StockTransactionSchema } from './schemas/stock-transaction.schema';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StockTransaction.name, schema: StockTransactionSchema }]),
    forwardRef(() => ProductsModule),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService, MongooseModule],
})
export class InventoryModule {}
