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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { PaginationQueryDto } from '../common/utils/pagination.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Create customer profile' })
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers with pagination, search, and receivable summary' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'List active customers for selectors' })
  async findAllActive() {
    return this.customersService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer details' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/ledger')
  @ApiOperation({ summary: 'Get customer transaction ledger statement' })
  async getLedger(@Param('id') id: string) {
    return this.customersService.getLedger(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update customer details' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Archive/Delete customer' })
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
