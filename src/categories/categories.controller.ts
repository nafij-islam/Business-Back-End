import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { PaginationQueryDto } from '../common/utils/pagination.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create new category' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List categories with server pagination and search' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'List all active categories for dropdown selectors' })
  async findAllActive() {
    return this.categoriesService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update category' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Archive/Delete category' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.archive(id);
  }

  @Patch(':id/archive')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Archive category (soft-disable without deleting historical data)' })
  async archive(@Param('id') id: string) {
    return this.categoriesService.archive(id);
  }

  @Patch(':id/restore')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Restore archived category' })
  async restore(@Param('id') id: string) {
    return this.categoriesService.restore(id);
  }
}
