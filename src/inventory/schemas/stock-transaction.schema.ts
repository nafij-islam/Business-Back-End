import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';
import { User } from '../../users/schemas/user.schema';
import { StockTransactionType } from '../../common/enums';

export type StockTransactionDocument = HydratedDocument<StockTransaction>;

@Schema({ timestamps: true })
export class StockTransaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true, index: true })
  product: Product;

  @Prop({ type: String, enum: StockTransactionType, required: true, index: true })
  type: StockTransactionType;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  previousStock: number;

  @Prop({ required: true })
  newStock: number;

  @Prop({ default: null })
  unitCost?: number;

  @Prop({ default: null })
  referenceType?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  referenceId?: MongooseSchema.Types.ObjectId;

  @Prop({ default: null })
  reason?: string;

  @Prop({ default: null })
  note?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  performedBy?: User;

  @Prop({ default: () => new Date(), index: true })
  transactionDate: Date;
}

export const StockTransactionSchema = SchemaFactory.createForClass(StockTransaction);

StockTransactionSchema.index({ product: 1, transactionDate: -1 });
StockTransactionSchema.index({ type: 1, transactionDate: -1 });
