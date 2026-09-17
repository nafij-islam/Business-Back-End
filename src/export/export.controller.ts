import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('inventory')
  @ApiOperation({ summary: 'Export current inventory (JSON or CSV)' })
  async exportInventory(@Query('format') format: 'json' | 'csv' = 'json', @Res() res: Response) {
    const data = await this.exportService.exportInventory(format);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-export.csv"');
      return res.send(data);
    }
    return res.json({ success: true, data });
  }

  @Get('sales')
  @ApiOperation({ summary: 'Export sales transactions (JSON or CSV)' })
  async exportSales(@Query('format') format: 'json' | 'csv' = 'json', @Res() res: Response) {
    const data = await this.exportService.exportSales(format);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-export.csv"');
      return res.send(data);
    }
    return res.json({ success: true, data });
  }

  @Get('purchases')
  @ApiOperation({ summary: 'Export purchase records (JSON or CSV)' })
  async exportPurchases(@Query('format') format: 'json' | 'csv' = 'json', @Res() res: Response) {
    const data = await this.exportService.exportPurchases(format);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="purchases-export.csv"');
      return res.send(data);
    }
    return res.json({ success: true, data });
  }

  @Get('customers')
  @ApiOperation({ summary: 'Export customer directory (JSON or CSV)' })
  async exportCustomers(@Query('format') format: 'json' | 'csv' = 'json', @Res() res: Response) {
    const data = await this.exportService.exportCustomers(format);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="customers-export.csv"');
      return res.send(data);
    }
    return res.json({ success: true, data });
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Export supplier directory (JSON or CSV)' })
  async exportSuppliers(@Query('format') format: 'json' | 'csv' = 'json', @Res() res: Response) {
    const data = await this.exportService.exportSuppliers(format);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="suppliers-export.csv"');
      return res.send(data);
    }
    return res.json({ success: true, data });
  }
}
