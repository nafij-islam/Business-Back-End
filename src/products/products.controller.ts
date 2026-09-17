import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, QueryProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create new product with opening stock' })
  async create(@Body() dto: CreateProductDto, @CurrentUser('id') userId: string) {
    return this.productsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get products with server pagination, category, stock, and price filters',
  })
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get('find-by-code')
  @ApiOperation({ summary: 'Fast barcode / SKU lookup for sales and POS scanner' })
  async findByCode(@Query('code') code: string) {
    return this.productsService.findBySkuOrBarcode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details by ID' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update product properties' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.update(id, dto, userId);
  }

  @Patch(':id/archive')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Archive product (safe soft delete)' })
  async archive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.productsService.archive(id, userId);
  }

  @Patch(':id/restore')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Restore archived product' })
  async restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.productsService.restore(id, userId);
  }
}
