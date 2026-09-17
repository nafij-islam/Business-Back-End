import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Supplier } from '../../suppliers/schemas/supplier.schema';
import { Product } from '../../products/schemas/product.schema';
import { User } from '../../users/schemas/user.schema';
import { PaymentMethod, PaymentStatus, PurchaseStatus } from '../../common/enums';

export type PurchaseDocument = HydratedDocument<Purchase>;

@Schema({ _id: false })
export class PurchaseItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product: Product;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  productSku: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitCost: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;
}

@Schema({ timestamps: true })
export class Purchase {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  purchaseNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Supplier', required: true, index: true })
  supplier: Supplier;

  @Prop({ default: () => new Date(), index: true })
  purchaseDate: Date;

  @Prop({ type: [PurchaseItem], required: true })
  items: PurchaseItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  discount: number;

  @Prop({ default: 0, min: 0 })
  tax: number;

  @Prop({ default: 0, min: 0 })
  shippingCost: number;

  @Prop({ required: true, min: 0 })
  grandTotal: number;

  @Prop({ default: 0, min: 0 })
  paidAmount: number;

  @Prop({ default: 0, min: 0 })
  dueAmount: number;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.UNPAID, index: true })
  paymentStatus: PaymentStatus;

  @Prop({ type: String, enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Prop({ type: String, enum: PurchaseStatus, default: PurchaseStatus.COMPLETED, index: true })
  status: PurchaseStatus;

  @Prop({ default: null })
  note?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  createdBy?: User;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);
PurchaseSchema.index({ supplier: 1, purchaseDate: -1 });
PurchaseSchema.index({ status: 1, purchaseDate: -1 });
