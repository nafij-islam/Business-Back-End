import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Sale } from '../../sales/schemas/sale.schema';
import { Purchase } from '../../purchases/schemas/purchase.schema';
import { Customer } from '../../customers/schemas/customer.schema';
import { Supplier } from '../../suppliers/schemas/supplier.schema';
import { User } from '../../users/schemas/user.schema';
import { PaymentMethod, PaymentType } from '../../common/enums';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({ type: String, enum: PaymentType, required: true, index: true })
  type: PaymentType;

  @Prop({ default: null, trim: true })
  reference?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Sale', default: null, index: true })
  sale?: Sale;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Purchase', default: null, index: true })
  purchase?: Purchase;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', default: null, index: true })
  customer?: Customer;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Supplier', default: null, index: true })
  supplier?: Supplier;

  @Prop({ default: () => new Date(), index: true })
  transactionDate: Date;

  @Prop({ default: null })
  note?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  performedBy?: User;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ type: 1, transactionDate: -1 });
