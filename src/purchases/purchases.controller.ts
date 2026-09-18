import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, PurchaseReturnDto, QueryPurchaseDto } from './dto/purchase.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create purchase order and atomically update inventory and payables' })
  async create(@Body() dto: CreatePurchaseDto, @CurrentUser('id') userId: string) {
    return this.purchasesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List purchases with date range and supplier filters' })
  async findAll(@Query() query: QueryPurchaseDto) {
    return this.purchasesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase details' })
  async findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Post([':id/return', ':id/returns'])
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Process purchase return to supplier' })
  async processReturn(
    @Param('id') id: string,
    @Body() dto: PurchaseReturnDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.purchasesService.processReturn(id, dto, userId);
  }
}
