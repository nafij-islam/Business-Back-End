import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ default: null, trim: true, lowercase: true })
  email?: string;

  @Prop({ default: null })
  address?: string;

  @Prop({ default: 0 })
  openingBalance: number;

  @Prop({ default: 0 })
  currentReceivable: number;

  @Prop({ default: null })
  notes?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ name: 'text', phone: 'text', email: 'text' });
