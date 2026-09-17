import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, index: true })
  user?: User;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ required: true, index: true })
  entityType: string;

  @Prop({ default: null, index: true })
  entityId?: string;

  @Prop({ required: true })
  summary: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: null })
  ip?: string;

  @Prop({ default: null })
  userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });
