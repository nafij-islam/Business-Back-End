import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { PaginationQueryDto } from '../common/utils/pagination.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs with pagination and search' })
  async getAuditLogs(@Query() query: PaginationQueryDto) {
    return this.auditLogsService.findAll(query);
  }
}
