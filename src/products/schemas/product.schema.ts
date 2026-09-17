import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Category } from '../../categories/schemas/category.schema';
import { Brand } from '../../brands/schemas/brand.schema';
import { Unit } from '../../units/schemas/unit.schema';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  SKU: string;

  @Prop({ default: null, trim: true, sparse: true, index: true })
  barcode?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', required: true, index: true })
  category: Category;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Brand', default: null, index: true })
  brand?: Brand;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Unit', required: true, index: true })
  unit: Unit;

  @Prop({ default: null })
  description?: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ required: true, min: 0 })
  purchasePrice: number;

  @Prop({ required: true, min: 0 })
  sellingPrice: number;

  @Prop({ default: null, min: 0 })
  wholesalePrice?: number;

  @Prop({ default: 0 })
  currentStock: number;

  @Prop({ default: null })
  lowStockThreshold?: number;

  @Prop({ default: 0 })
  openingStock: number;

  @Prop({ default: true })
  trackStock: boolean;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: false, index: true })
  isArchived: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  customAttributes: Record<string, any>;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Text index for search
ProductSchema.index({ name: 'text', SKU: 'text', barcode: 'text', description: 'text' });
// Compound indexes for high-frequency queries
ProductSchema.index({ isArchived: 1, isActive: 1, category: 1 });
ProductSchema.index({ isArchived: 1, currentStock: 1 });
