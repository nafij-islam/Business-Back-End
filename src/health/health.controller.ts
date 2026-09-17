import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Application and database connectivity health check' })
  async check() {
    const isDbConnected = this.connection.readyState === 1;
    const status = isDbConnected ? 'healthy' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        application: 'up',
        database: isDbConnected ? 'connected' : 'disconnected',
      },
    };
  }
}
