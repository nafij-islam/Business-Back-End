import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto, QuerySaleDto, SaleReturnDto } from './dto/sale.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Create new sale invoice with inventory reduction and profit capture' })
  async create(@Body() dto: CreateSaleDto, @CurrentUser('id') userId: string) {
    return this.salesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List sales invoices with date range and customer filters' })
  async findAll(@Query() query: QuerySaleDto) {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale invoice details' })
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post(':id/return')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Process customer sale return' })
  async processReturn(
    @Param('id') id: string,
    @Body() dto: SaleReturnDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesService.processReturn(id, dto, userId);
  }
}
