import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { DatePreset } from '../common/utils/date-range.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(['profit', 'profit-loss'])
  @ApiOperation({
    summary:
      'Profit & Loss report (Gross Sales, Net Sales, COGS, Gross Profit, Operating Expenses, Net Operating Profit)',
  })
  async getProfitReport(
    @Query('preset') preset?: DatePreset,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getProfitReport(preset, startDate, endDate);
  }

  @Get(['products', 'product-performance'])
  @ApiOperation({ summary: 'Product performance report (Top selling and profitable products)' })
  async getProductPerformance(
    @Query('preset') preset?: DatePreset,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getProductPerformance(
      preset,
      startDate,
      endDate,
      limit ? Number(limit) : 10,
    );
  }

  @Get(['categories', 'category-performance'])
  @ApiOperation({ summary: 'Category performance report' })
  async getCategoryPerformance(
    @Query('preset') preset?: DatePreset,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getCategoryPerformance(preset, startDate, endDate);
  }

  @Get('monthly')
  @ApiOperation({
    summary: 'Monthly Business Report with day-by-day datasets for interactive charts',
  })
  async getMonthlyReport(@Query('year') year?: number, @Query('month') month?: number) {
    const now = new Date();
    const targetYear = year ? Number(year) : now.getFullYear();
    const targetMonth = month ? Number(month) : now.getMonth() + 1;
    return this.reportsService.getMonthlyBusinessReport(targetYear, targetMonth);
  }
}
