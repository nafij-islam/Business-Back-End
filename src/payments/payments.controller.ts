import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { QueryPaymentDto, RecordPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Record manual payment (customer receipt or supplier payment)' })
  async recordPayment(@Body() dto: RecordPaymentDto, @CurrentUser('id') userId: string) {
    return this.paymentsService.recordPayment(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all payments and cash-flow entries' })
  async findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAll(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Cash-flow summary (total inflow, outflow, net)' })
  async getCashFlowSummary() {
    return this.paymentsService.getCashFlowSummary();
  }
}
