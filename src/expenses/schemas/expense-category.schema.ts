import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategory>;

@Schema({ timestamps: true })
export class ExpenseCategory {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ default: null })
  description?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const ExpenseCategorySchema = SchemaFactory.createForClass(ExpenseCategory);
