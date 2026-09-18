import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { PaginationQueryDto, createPaginatedResponse } from '../common/utils/pagination.util';
import { roundToTwoDecimals } from '../common/utils/currency.util';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {}

  async create(dto: CreateCustomerDto): Promise<CustomerDocument> {
    const openingBalance = dto.openingBalance || 0;
    const customer = new this.customerModel({
      ...dto,
      openingBalance,
      currentReceivable: openingBalance,
      isActive: true,
    });
    return customer.save();
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = query;
    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sortObj: Record<string, any> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total, totalReceivableAgg] = await Promise.all([
      this.customerModel
        .find(filter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.customerModel.countDocuments(filter).exec(),
      this.customerModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalReceivable: { $sum: '$currentReceivable' } } },
      ]),
    ]);

    const paginated = createPaginatedResponse(data, total, page, limit);

    return {
      ...paginated,
      totalReceivable: roundToTwoDecimals(totalReceivableAgg[0]?.totalReceivable || 0),
    };
  }

  async findAllActive() {
    return this.customerModel.find({ isActive: true }).sort({ name: 1 }).lean().exec();
  }

  async findOne(id: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerDocument> {
    const customer = await this.findOne(id);
    Object.assign(customer, dto);
    return customer.save();
  }

  /**
   * Adjust customer receivable balance atomically during sales, returns, or payment receipts.
   */
  async adjustReceivable(
    customerId: string,
    delta: number,
    session: ClientSession | null = null,
  ): Promise<CustomerDocument> {
    const query = this.customerModel.findById(customerId);
    if (session) query.session(session);
    const customer = await query.exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${customerId}' not found`);
    }

    customer.currentReceivable = roundToTwoDecimals(customer.currentReceivable + delta);

    if (session) {
      await customer.save({ session });
    } else {
      await customer.save();
    }

    return customer;
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const customer = await this.findOne(id);
    customer.isActive = false;
    await customer.save();
    return { success: true, message: `Customer '${customer.name}' archived successfully` };
  }

  async getLedger(id: string): Promise<{ entries: any[] }> {
    const customer = await this.findOne(id);
    const sales = await this.customerModel.db
      .collection('sales')
      .find({ customer: customer._id })
      .sort({ saleDate: 1, createdAt: 1 })
      .toArray();

    let runningBalance = customer.openingBalance || 0;
    const entries: any[] = [];

    if (customer.openingBalance) {
      entries.push({
        date: (customer as any).createdAt || new Date(),
        type: 'Opening Balance',
        reference: 'OPENING',
        debit: customer.openingBalance > 0 ? customer.openingBalance : 0,
        credit: customer.openingBalance < 0 ? Math.abs(customer.openingBalance) : 0,
        balance: runningBalance,
      });
    }

    for (const sale of sales) {
      const due = sale.dueAmount !== undefined ? sale.dueAmount : ((sale.grandTotal || 0) - (sale.paidAmount || 0));
      runningBalance += due;
      entries.push({
        date: sale.saleDate || sale.createdAt,
        type: 'Sale Invoice',
        reference: sale.invoiceNumber,
        debit: sale.grandTotal,
        credit: sale.paidAmount || 0,
        balance: runningBalance,
      });
    }

    return { entries };
  }
}
