import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { PaginationQueryDto } from '../common/utils/pagination.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create supplier profile' })
  async create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers with pagination, search, and payable summary' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.suppliersService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'List active suppliers for selectors' })
  async findAllActive() {
    return this.suppliersService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier details' })
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update supplier details' })
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }
}
