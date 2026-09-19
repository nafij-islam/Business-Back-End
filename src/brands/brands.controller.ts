import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { PaginationQueryDto } from '../common/utils/pagination.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create brand' })
  async create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List brands with pagination and search' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.brandsService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'List active brands for selectors' })
  async findAllActive() {
    return this.brandsService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  async findOne(@Param('id') id: string) {
    return this.brandsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update brand' })
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Delete brand' })
  async remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }
}
