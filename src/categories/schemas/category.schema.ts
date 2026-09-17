import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ default: null })
  description?: string;

  @Prop({ default: null })
  image?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', default: null, index: true })
  parentCategory?: Category;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ name: 'text', description: 'text' });
