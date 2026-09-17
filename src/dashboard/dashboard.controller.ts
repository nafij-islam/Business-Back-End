import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.VIEWER)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Consolidated dashboard endpoint with KPIs, 30-day chart, and recent activity',
  })
  async getDashboardSummary() {
    return this.dashboardService.getDashboardSummary();
  }

  @Get('health-metrics')
  @ApiOperation({ summary: 'Period-over-period performance and business health percentages' })
  async getHealthMetrics() {
    return this.dashboardService.getHealthMetrics();
  }
}
