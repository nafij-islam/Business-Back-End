import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { RecordPaymentDto, QueryPaymentDto } from './dto/payment.dto';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { roundToTwoDecimals } from '../common/utils/currency.util';
import { PaymentType } from '../common/enums';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async recordPayment(
    dto: RecordPaymentDto,
    performedBy?: string,
    session: ClientSession | null = null,
  ): Promise<PaymentDocument> {
    const payment = new this.paymentModel({
      amount: roundToTwoDecimals(dto.amount),
      method: dto.method,
      type: dto.type,
      reference: dto.reference || null,
      sale: dto.sale || null,
      purchase: dto.purchase || null,
      customer: dto.customer || null,
      supplier: dto.supplier || null,
      transactionDate: dto.transactionDate || new Date(),
      note: dto.note || null,
      performedBy: performedBy || null,
    });

    if (session) {
      return payment.save({ session });
    }
    return payment.save();
  }

  async findAll(query: QueryPaymentDto) {
    const { page = 1, limit = 20, type, method, startDate, endDate, search } = query;
    const filter: Record<string, any> = {};

    if (type) filter.type = type;
    if (method) filter.method = method;

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.transactionDate.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .populate('customer', 'name phone')
        .populate('supplier', 'name companyName')
        .populate('performedBy', 'firstName lastName')
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getCashFlowSummary() {
    const result = await this.paymentModel.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let totalIn = 0;
    let totalOut = 0;

    for (const r of result) {
      if (r._id === PaymentType.SALE_PAYMENT || r._id === PaymentType.CUSTOMER_RECEIPT) {
        totalIn += r.total;
      } else if (r._id === PaymentType.PURCHASE_PAYMENT || r._id === PaymentType.SUPPLIER_PAYMENT) {
        totalOut += r.total;
      }
    }

    return {
      totalInflow: roundToTwoDecimals(totalIn),
      totalOutflow: roundToTwoDecimals(totalOut),
      netCashFlow: roundToTwoDecimals(totalIn - totalOut),
    };
  }
}
