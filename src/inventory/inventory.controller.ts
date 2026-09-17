import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  QueryStockTransactionsDto,
  StockAdjustmentDto,
  StockInDto,
  StockOutDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('stock-in')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGER)
  @ApiOperation({ summary: 'Record manual stock in (inventory increment)' })
  async stockIn(@Body() dto: StockInDto, @CurrentUser('id') userId: string) {
    return this.inventoryService.stockIn(dto, userId);
  }

  @Post('stock-out')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGER)
  @ApiOperation({ summary: 'Record manual stock out (damage, lost, personal use, etc.)' })
  async stockOut(@Body() dto: StockOutDto, @CurrentUser('id') userId: string) {
    return this.inventoryService.stockOut(dto, userId);
  }

  @Post('adjust')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGER)
  @ApiOperation({ summary: 'Reconcile stock count to a new quantity with required reason' })
  async adjustStock(@Body() dto: StockAdjustmentDto, @CurrentUser('id') userId: string) {
    return this.inventoryService.adjustStock(dto, userId);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Get current inventory with stock status, search, and valuation summary',
  })
  async getCurrentInventory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('stockStatus') stockStatus?: 'all' | 'inStock' | 'lowStock' | 'outOfStock',
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.inventoryService.getCurrentInventory({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      category,
      stockStatus,
      sortBy,
      sortOrder,
    });
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get total inventory purchase and potential selling valuation' })
  async getValuationSummary() {
    return this.inventoryService.getValuationSummary();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock and out of stock alert items' })
  async getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Audit trail of all immutable stock movements' })
  async getTransactions(@Query() query: QueryStockTransactionsDto) {
    return this.inventoryService.getTransactions(query);
  }
}
