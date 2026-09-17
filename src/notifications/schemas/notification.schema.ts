import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { NotificationType } from '../../common/enums';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: String, enum: NotificationType, default: NotificationType.SYSTEM, index: true })
  type: NotificationType;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  relatedEntity?: {
    entityType: string;
    entityId: string;
  };

  @Prop({ default: false, index: true })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ isRead: 1, createdAt: -1 });
