import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from './schemas/expense.schema';
import { ExpenseCategory, ExpenseCategoryDocument } from './schemas/expense-category.schema';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  QueryExpenseDto,
  UpdateExpenseCategoryDto,
} from './dto/expense.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { roundToTwoDecimals } from '../common/utils/currency.util';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly categoryModel: Model<ExpenseCategoryDocument>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async onModuleInit() {
    const count = await this.categoryModel.countDocuments().exec();
    if (count === 0) {
      const defaultCategories = [
        { name: 'Rent', description: 'Facility, office, warehouse or store rent' },
        { name: 'Salary', description: 'Staff salaries and payroll' },
        { name: 'Electricity', description: 'Power and utility bills' },
        { name: 'Internet', description: 'Internet and telecommunications' },
        { name: 'Transport', description: 'Shipping, fuel, logistics and delivery' },
        { name: 'Marketing', description: 'Advertisements, flyers, and promotions' },
        { name: 'Packaging', description: 'Boxes, bags, tape and shipping material' },
        { name: 'Maintenance', description: 'Repairs, servicing and cleaning' },
        { name: 'Other', description: 'Miscellaneous operational expenses' },
      ];
      await this.categoryModel.insertMany(defaultCategories);
    }
  }

  // --- Expense Categories ---
  async createCategory(dto: CreateExpenseCategoryDto): Promise<ExpenseCategoryDocument> {
    const existing = await this.categoryModel.findOne({ name: dto.name.trim() }).exec();
    if (existing) {
      throw new BadRequestException(`Category '${dto.name}' already exists`);
    }
    const cat = new this.categoryModel({
      name: dto.name.trim(),
      description: dto.description || null,
      isActive: true,
    });
    return cat.save();
  }

  async findAllCategories() {
    return this.categoryModel.find({ isActive: true }).sort({ name: 1 }).lean().exec();
  }

  async updateCategory(
    id: string,
    dto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategoryDocument> {
    const cat = await this.categoryModel.findById(id).exec();
    if (!cat) throw new NotFoundException(`Expense category with ID '${id}' not found`);
    if (dto.name) cat.name = dto.name.trim();
    if (dto.description !== undefined) cat.description = dto.description;
    if (dto.isActive !== undefined) cat.isActive = dto.isActive;
    return cat.save();
  }

  // --- Expenses ---
  async create(dto: CreateExpenseDto, userId?: string): Promise<ExpenseDocument> {
    const category = await this.categoryModel.findById(dto.category).exec();
    if (!category) {
      throw new NotFoundException(`Expense category with ID '${dto.category}' not found`);
    }

    const expense = new this.expenseModel({
      category: category._id,
      amount: roundToTwoDecimals(dto.amount),
      expenseDate: dto.expenseDate || new Date(),
      paymentMethod: dto.paymentMethod,
      reference: dto.reference || null,
      attachment: dto.attachment || null,
      note: dto.note || null,
      createdBy: userId || null,
    });

    const saved = await expense.save();

    await this.auditLogsService.log({
      userId,
      action: AuditAction.EXPENSE_CREATED,
      entityType: 'Expense',
      entityId: saved._id.toString(),
      summary: `Recorded expense of $${saved.amount} for category '${category.name}'`,
      metadata: { amount: saved.amount, category: category.name },
    });

    return saved;
  }

  async findAll(query: QueryExpenseDto) {
    const { page = 1, limit = 20, category, paymentMethod, startDate, endDate, search } = query;
    const filter: Record<string, any> = {};

    if (category) filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total, totalExpenseAgg] = await Promise.all([
      this.expenseModel
        .find(filter)
        .populate('category', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.expenseModel.countDocuments(filter).exec(),
      this.expenseModel.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const paginated = createPaginatedResponse(data, total, page, limit);

    return {
      ...paginated,
      totalAmount: roundToTwoDecimals(totalExpenseAgg[0]?.total || 0),
    };
  }

  async getCategoryBreakdown(startDate?: Date, endDate?: Date) {
    const match: Record<string, any> = {};
    if (startDate || endDate) {
      match.expenseDate = {};
      if (startDate) match.expenseDate.$gte = startDate;
      if (endDate) match.expenseDate.$lte = endDate;
    }

    const result = await this.expenseModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'expensecategories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: '$categoryDetails' },
      {
        $project: {
          categoryId: '$_id',
          categoryName: '$categoryDetails.name',
          totalAmount: { $round: ['$totalAmount', 2] },
          count: 1,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    return result;
  }

  async remove(id: string, userId?: string): Promise<{ message: string }> {
    const expense = await this.expenseModel.findById(id).populate('category', 'name').exec();
    if (!expense) throw new NotFoundException(`Expense with ID '${id}' not found`);

    await this.expenseModel.findByIdAndDelete(id).exec();

    await this.auditLogsService.log({
      userId,
      action: AuditAction.EXPENSE_DELETED,
      entityType: 'Expense',
      entityId: id,
      summary: `Deleted expense of $${expense.amount} for category '${(expense.category as any)?.name}'`,
    });

    return { message: 'Expense deleted successfully' };
  }
}
