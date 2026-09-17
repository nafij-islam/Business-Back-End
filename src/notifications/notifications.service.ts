import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { NotificationType } from '../common/enums';
import { PaginationQueryDto, createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(params: {
    title: string;
    message: string;
    type: NotificationType;
    relatedEntity?: { entityType: string; entityId: string };
  }): Promise<NotificationDocument | null> {
    try {
      // Prevent duplicate notification spam for same unread entity
      if (params.relatedEntity) {
        const existing = await this.notificationModel.findOne({
          'relatedEntity.entityType': params.relatedEntity.entityType,
          'relatedEntity.entityId': params.relatedEntity.entityId,
          type: params.type,
          isRead: false,
        });
        if (existing) {
          return existing;
        }
      }

      const notification = new this.notificationModel({
        title: params.title,
        message: params.message,
        type: params.type,
        relatedEntity: params.relatedEntity || null,
        isRead: false,
      });

      return await notification.save();
    } catch (err: any) {
      this.logger.error(`Error creating notification: ${err.message}`);
      return null;
    }
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await Promise.all([
      this.notificationModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments().exec(),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getUnreadCount(): Promise<number> {
    return this.notificationModel.countDocuments({ isRead: false }).exec();
  }

  async markAsRead(id: string): Promise<NotificationDocument | null> {
    return this.notificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true }).exec();
  }

  async markAllAsRead(): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel
      .updateMany({ isRead: false }, { isRead: true })
      .exec();
    return { modifiedCount: result.modifiedCount };
  }
}
