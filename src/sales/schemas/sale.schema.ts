import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Customer } from '../../customers/schemas/customer.schema';
import { Product } from '../../products/schemas/product.schema';
import { User } from '../../users/schemas/user.schema';
import { PaymentMethod, PaymentStatus, SaleStatus } from '../../common/enums';

export type SaleDocument = HydratedDocument<Sale>;

@Schema({ _id: false })
export class SaleItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product: Product;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  productSku: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  sellingPrice: number;

  // CRITICAL REQUIREMENT: Purchase cost basis captured at the exact moment of sale
  @Prop({ required: true, min: 0 })
  purchaseCostAtSale: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  // Profit on this line item: (sellingPrice - purchaseCostAtSale) * quantity
  @Prop({ required: true })
  profit: number;
}

@Schema({ timestamps: true })
export class Sale {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  saleNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', default: null, index: true })
  customer?: Customer;

  @Prop({ default: () => new Date(), index: true })
  saleDate: Date;

  @Prop({ type: [SaleItem], required: true })
  items: SaleItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  discount: number;

  @Prop({ default: 0, min: 0 })
  tax: number;

  @Prop({ required: true, min: 0 })
  grandTotal: number;

  @Prop({ default: 0, min: 0 })
  paidAmount: number;

  @Prop({ default: 0, min: 0 })
  dueAmount: number;

  @Prop({ required: true })
  totalProfit: number;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PAID, index: true })
  paymentStatus: PaymentStatus;

  @Prop({ type: String, enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Prop({ type: String, enum: SaleStatus, default: SaleStatus.COMPLETED, index: true })
  status: SaleStatus;

  @Prop({ default: null })
  notes?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  createdBy?: User;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
SaleSchema.index({ customer: 1, saleDate: -1 });
SaleSchema.index({ status: 1, saleDate: -1 });
SaleSchema.index({ saleNumber: 'text' });
