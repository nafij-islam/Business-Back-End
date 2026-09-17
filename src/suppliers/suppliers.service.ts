import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { PaginationQueryDto, createPaginatedResponse } from '../common/utils/pagination.util';
import { roundToTwoDecimals } from '../common/utils/currency.util';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
  ) {}

  async create(dto: CreateSupplierDto): Promise<SupplierDocument> {
    const openingBalance = dto.openingBalance || 0;
    const supplier = new this.supplierModel({
      ...dto,
      openingBalance,
      currentPayable: openingBalance,
      isActive: true,
    });
    return supplier.save();
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = query;
    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sortObj: Record<string, any> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total, totalPayableAgg] = await Promise.all([
      this.supplierModel
        .find(filter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.supplierModel.countDocuments(filter).exec(),
      this.supplierModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalPayable: { $sum: '$currentPayable' } } },
      ]),
    ]);

    const paginated = createPaginatedResponse(data, total, page, limit);

    return {
      ...paginated,
      totalPayable: roundToTwoDecimals(totalPayableAgg[0]?.totalPayable || 0),
    };
  }

  async findAllActive() {
    return this.supplierModel.find({ isActive: true }).sort({ name: 1 }).lean().exec();
  }

  async findOne(id: string): Promise<SupplierDocument> {
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID '${id}' not found`);
    }
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierDocument> {
    const supplier = await this.findOne(id);
    Object.assign(supplier, dto);
    return supplier.save();
  }

  /**
   * Adjust payable balance atomically during purchases, returns, or supplier payments.
   */
  async adjustPayable(
    supplierId: string,
    delta: number,
    session: ClientSession | null = null,
  ): Promise<SupplierDocument> {
    const query = this.supplierModel.findById(supplierId);
    if (session) query.session(session);
    const supplier = await query.exec();

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID '${supplierId}' not found`);
    }

    supplier.currentPayable = roundToTwoDecimals(supplier.currentPayable + delta);

    if (session) {
      await supplier.save({ session });
    } else {
      await supplier.save();
    }

    return supplier;
  }
}
