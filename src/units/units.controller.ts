import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { PaginationQueryDto } from '../common/utils/pagination.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create dynamic product measurement unit' })
  async create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List units with pagination and search' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.unitsService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'List all active units for dropdown selectors' })
  async findAllActive() {
    return this.unitsService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get unit by ID' })
  async findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update measurement unit' })
  async update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }
}
