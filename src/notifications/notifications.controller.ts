import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PaginationQueryDto } from '../common/utils/pagination.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications' })
  async getNotifications(@Query() query: PaginationQueryDto) {
    return this.notificationsService.findAll(query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  async getUnreadCount() {
    const count = await this.notificationsService.getUnreadCount();
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }
}
