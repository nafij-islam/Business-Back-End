import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Root')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'API Root Information and Health Status' })
  getRoot() {
    return {
      name: 'Apex Business Management System API',
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      health: '/health',
      apiPrefix: '/api/v1',
      endpoints: {
        health: '/health',
        auth: '/api/v1/auth',
        settings: '/api/v1/settings',
        products: '/api/v1/products',
        inventory: '/api/v1/inventory',
        sales: '/api/v1/sales',
        purchases: '/api/v1/purchases',
        expenses: '/api/v1/expenses',
        reports: '/api/v1/reports',
        dashboard: '/api/v1/dashboard',
      },
    };
  }
}
