import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { PaginationQueryDto, createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(params: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    summary: string;
    metadata?: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }): Promise<AuditLogDocument> {
    try {
      const entry = new this.auditLogModel({
        user: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        summary: params.summary,
        metadata: params.metadata || {},
        ip: params.ip || null,
        userAgent: params.userAgent ? params.userAgent.substring(0, 150) : null,
      });
      return await entry.save();
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`);
      return null as any;
    }
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { entityType: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('user', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }
}
