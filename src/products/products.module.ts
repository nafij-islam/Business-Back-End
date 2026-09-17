import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    forwardRef(() => InventoryModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}
