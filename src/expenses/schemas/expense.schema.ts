import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { ExpenseCategory } from './expense-category.schema';
import { User } from '../../users/schemas/user.schema';
import { PaymentMethod } from '../../common/enums';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({ timestamps: true })
export class Expense {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ExpenseCategory',
    required: true,
    index: true,
  })
  category: ExpenseCategory;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ default: () => new Date(), index: true })
  expenseDate: Date;

  @Prop({ type: String, enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Prop({ default: null })
  reference?: string;

  @Prop({ default: null })
  attachment?: string;

  @Prop({ default: null })
  note?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  createdBy?: User;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
ExpenseSchema.index({ category: 1, expenseDate: -1 });
ExpenseSchema.index({ expenseDate: -1 });
