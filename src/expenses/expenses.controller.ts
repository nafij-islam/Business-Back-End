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
import { ExpensesService } from './expenses.service';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  QueryExpenseDto,
  UpdateExpenseCategoryDto,
} from './dto/expense.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Record business expense' })
  async create(@Body() dto: CreateExpenseDto, @CurrentUser('id') userId: string) {
    return this.expensesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List business expenses with date and category filters' })
  async findAll(@Query() query: QueryExpenseDto) {
    return this.expensesService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all dynamic expense categories' })
  async findAllCategories() {
    return this.expensesService.findAllCategories();
  }

  @Post('categories')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create new dynamic expense category' })
  async createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update expense category' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.expensesService.updateCategory(id, dto);
  }

  @Get('breakdown')
  @ApiOperation({ summary: 'Get category-wise expense breakdown' })
  async getBreakdown(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.expensesService.getCategoryBreakdown(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Delete expense record' })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.expensesService.remove(id, userId);
  }
}
