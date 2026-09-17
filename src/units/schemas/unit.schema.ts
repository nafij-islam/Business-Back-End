import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UnitDocument = HydratedDocument<Unit>;

@Schema({ timestamps: true })
export class Unit {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  shortName: string;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);
