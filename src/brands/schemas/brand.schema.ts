import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BrandDocument = HydratedDocument<Brand>;

@Schema({ timestamps: true })
export class Brand {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ default: null })
  logo?: string;

  @Prop({ default: null })
  description?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
BrandSchema.index({ name: 'text' });
