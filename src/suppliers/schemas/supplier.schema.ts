import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SupplierDocument = HydratedDocument<Supplier>;

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: null, trim: true })
  companyName?: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ default: null, trim: true, lowercase: true })
  email?: string;

  @Prop({ default: null })
  address?: string;

  @Prop({ default: null })
  contactPerson?: string;

  @Prop({ default: 0 })
  openingBalance: number;

  @Prop({ default: 0 })
  currentPayable: number;

  @Prop({ default: null })
  note?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
SupplierSchema.index({ name: 'text', companyName: 'text', phone: 'text' });
